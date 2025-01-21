import _ from 'lodash'
import type {
  ColumnElementType,
  ColumnPrecision,
  DialectOptions,
  FKRow,
  FKSpec,
  TriggerCount
} from '../Dialects/Options'
import type { AutoOptions, Field, IndexSpec, Table } from '../Types'
import { Dialects } from '../Dialects'
import { TableData } from '../Types'
import { type Dialect, QueryInterface, QueryTypes, Sequelize } from 'sequelize'
import { Logger } from '../../Logging'

/** Queries the database and builds the tables, foreignKeys, indexes, and hasTriggerTables structures in TableData  */
export class MigrationBuilder {
  sequelize: Sequelize
  queryInterface: QueryInterface
  dialect: DialectOptions
  includeTables?: string[]
  skipTables?: string[]
  schema?: string
  views: boolean
  tableData: TableData

  constructor(sequelize: Sequelize, options: AutoOptions) {
    this.sequelize = sequelize
    this.queryInterface = this.sequelize.getQueryInterface()
    this.dialect = Dialects[this.sequelize.getDialect() as Dialect]
    this.includeTables = options.tables
    this.skipTables = options.skipTables
    this.schema = options.schema
    this.views = !!options.views

    this.tableData = new TableData()
  }

  async build(): Promise<TableData> {
    try {
      const tables = await this.getTables()

      if (this.views) {
        const views = await this.getViews()
        tables.push(...views)
      }

      return this.processTables(tables)
    } catch (err: any) {
      Logger.Error('Migration Builder Error: {0}', err.message)
      return this.tableData
    }
  }

  private async getTables(): Promise<any[]> {
    if (this.dialect.showTablesQuery) {
      const showTablesSql = this.dialect.showTablesQuery(this.schema)
      return this.executeQuery<string>(showTablesSql)
    }
    return this.queryInterface.showAllTables()
  }

  private async getViews(): Promise<any[]> {
    const showViewsSql = this.dialect.showViewsQuery(this.dialect.name === 'mysql' ? this.sequelize.getDatabaseName() : this.schema)
    return this.executeQuery<string>(showViewsSql)
  }


  private async processTables(tableResult: any[]) {
    let tables = _.map(tableResult, t => {
      return {
        table_name: t.table_name || t.tableName || t.name || String(t),
        table_schema: t.table_schema || t.tableSchema || t.schema || this.schema || null
      } as Table
    })

    // include/exclude tables
    if (this.includeTables) {
      const optionTables = mapOptionTables(this.includeTables, this.schema)
      tables = _.intersectionWith(tables, optionTables, isTableEqual)
    } else if (this.skipTables) {
      const skipTables = mapOptionTables(this.skipTables, this.schema)
      tables = _.differenceWith(tables, skipTables, isTableEqual)
    }

    const promises = tables.map(async t => {
      await this.mapForeignKeys(t)
      return await this.MapTable(t)
    })

    await Promise.all(promises)
    return this.tableData
  }

  private async mapForeignKeys(table: Table) {
    let res: FKRow[] = [] as FKRow[]
    const tableQname = makeTableQName(table)
    const sql = this.dialect.getForeignKeysQuery(table.table_name, table.table_schema || this.sequelize.getDatabaseName())
    const dialect = this.dialect
    const foreignKeys = this.tableData.foreignKeys

    try {
      res = await this.executeQuery<FKRow>(sql)
      res.forEach(assignColumnDetails)
    } catch (err) {
      console.error(err)
    }

    function assignColumnDetails(row: FKRow) {
      let ref: FKSpec

      // Remap row using dialect remapping function if available
      if (dialect.remapForeignKeysRow) {
        ref = dialect.remapForeignKeysRow(table.table_name, row) as FKSpec
      } else {
        ref = row as any as FKSpec
      }

      // Check if source and target columns are not empty
      if (ref.source_column?.trim() && ref.target_column?.trim()) {
        ref.isForeignKey = true
        ref.foreignSources = pickFields(ref, ['source_table', 'source_schema', 'target_schema', 'target_table', 'source_column', 'target_column'])
      }

      // Check if foreign key is unique
      if (dialect.isUnique && dialect.isUnique(ref as any as FKRow, res)) {
        ref.isUnique = ref.constraint_name || true
      }

      // Check if foreign key is a primary key
      if (typeof dialect.isPrimaryKey === 'function' && dialect.isPrimaryKey(ref)) {
        ref.isPrimaryKey = true
      }

      // Check if foreign key is a serial key
      if (dialect.isSerialKey && dialect.isSerialKey(ref)) {
        ref.isSerialKey = true
      }

      // Add foreign key reference to foreignKeys object
      foreignKeys[tableQname] = foreignKeys[tableQname] || {}
      foreignKeys[tableQname][ref.source_column] = { ...foreignKeys[tableQname][ref.source_column], ...ref }
    }

    // Helper function to pick specified fields from an object
    function pickFields(obj: any, fields: string[]) {
      return fields.reduce((result, key) => {
        if (key in obj) {
          result[key] = obj[key]
        }
        return result
      }, {} as Record<string, any>)
    }
  }


  private async MapTable(table: Table) {
    try {
      const fields = await this.queryInterface.describeTable(table.table_name, table.table_schema)
      this.tableData.tables[makeTableQName(table)] = fields

      // for postgres array or user-defined types, get element type
      if (this.dialect.showElementTypeQuery && (_.some(fields, { type: 'ARRAY' }) || _.some(fields, { type: 'USER-DEFINED' }))) {
        // get the subtype of the fields
        const elementTypeQuery = this.dialect.showElementTypeQuery(table.table_name, table.table_schema)

        const elementTypes = await this.executeQuery<ColumnElementType>(elementTypeQuery)
        // add element type to "elementType" property of field
        elementTypes.forEach(et => {
          const field = fields[et.column_name] as Field
          if (field.type === 'ARRAY') {
            field.elementType = et.element_type
            if (et.element_type === 'USER-DEFINED' && et.enum_values && !field.special.length) {
              field.elementType = 'ENUM'
              // fromArray is a method defined on Postgres QueryGenerator only
              field.special = (this.queryInterface as any).queryGenerator.fromArray(et.enum_values)
            }
          } else if (field.type === 'USER-DEFINED') {
            field.type = !field.special.length ? et.udt_name : 'ENUM'
          }
        })

        // TODO - in postgres, query geography_columns and geometry_columns for detail type
        if (elementTypes.some(et => et.udt_name === 'geography') && this.dialect.showGeographyTypeQuery) {
          const geographyTypeQuery = this.dialect.showGeographyTypeQuery(table.table_name, table.table_schema)
          const columnElementTypes = await this.executeQuery<ColumnElementType>(geographyTypeQuery)
          columnElementTypes.forEach(gt => {
            const fld = fields[gt.column_name] as Field
            if (fld.type === 'geography') {
              fld.elementType = `'${gt.udt_name}', ${gt.data_type}`
            }
          })
        }

        if (elementTypes.some(et => et.udt_name === 'geometry') && this.dialect.showGeometryTypeQuery) {
          const geometryTypeQuery = this.dialect.showGeometryTypeQuery(table.table_name, table.table_schema)
          const columnElementTypes = await this.executeQuery<ColumnElementType>(geometryTypeQuery)
          columnElementTypes.forEach(gt => {
            const fld = fields[gt.column_name] as Field
            if (fld.type === 'geometry') {
              fld.elementType = `'${gt.udt_name}', ${gt.data_type}`
            }
          })
        }

      }

      // for mssql numeric types, get the precision. QueryInterface.describeTable does not return it
      if (this.dialect.showPrecisionQuery && (_.some(fields, { type: 'DECIMAL' }) || _.some(fields, { type: 'NUMERIC' }))) {
        const precisionQuery = this.dialect.showPrecisionQuery(table.table_name, table.table_schema)
        const columnPrecisions = await this.executeQuery<ColumnPrecision>(precisionQuery)
        columnPrecisions.forEach(cp => {
          const fld = fields[cp.column_name] as Field
          if (cp.numeric_precision && (fld.type === 'DECIMAL' || fld.type === 'NUMERIC')) {
            fld.type = `${fld.type}(${cp.numeric_precision},${cp.numeric_scale})`
          }
        })
      }

      this.tableData.indexes[makeTableQName(table)] = await this.queryInterface.showIndex(
        { tableName: table.table_name, schema: table.table_schema }) as IndexSpec[]

      // if there is no primaryKey, and `id` field exists, then make id the primaryKey (#480)
      if (!_.some(fields, { primaryKey: true })) {
        const fieldId = _.keys(fields).find(f => f.toLowerCase() === 'id')
        const descriptionFieldId = fieldId && fields[fieldId]
        if (descriptionFieldId) {
          descriptionFieldId.primaryKey = true
        }
      }

      const countTriggerSql = this.dialect.countTriggerQuery(table.table_name, table.table_schema || '')
      const triggerResult = await this.executeQuery<TriggerCount>(countTriggerSql)
      const triggerCount = triggerResult && triggerResult[0] && triggerResult[0].trigger_count
      if (triggerCount > 0) {
        this.tableData.hasTriggerTables[makeTableQName(table)] = true
      }
    } catch (err) {
      console.error(err)
    }
  }

  private executeQuery<T>(query: string): Promise<T[]> {
    return this.sequelize.query(query, {
      type: QueryTypes.SELECT,
      raw: true
    }) as any as Promise<T[]>
  }
}

// option tables are a list of strings; each string is either
// table name (e.g. "Customer") or schema dot table name (e.g. "dbo.Customer")
function mapOptionTables(arr: string[], defaultSchema: string | undefined): Table[] {
  return _.map(arr, (t: string) => {
    const sp = t.split('.')
    return {
      table_name: sp[sp.length - 1],
      table_schema: sp.length > 1 ? sp[sp.length - 2] : defaultSchema
    }
  })
}

function isTableEqual(a: Table, b: Table) {
  return a.table_name === b.table_name && (!b.table_schema || a.table_schema === b.table_schema)
}

function makeTableQName(table: Table) {
  return [table.table_schema, table.table_name].filter(Boolean).join('.')
}
