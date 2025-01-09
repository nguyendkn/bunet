import _ from 'lodash'
import { type ColumnDescription } from 'sequelize'
import {
  MakeIndent,
  qNameSplit,
  MakeTableName,
  singularize,
  recase,
  qNameJoin,
  pluralize
} from '../Types'
import type {
  AutoOptions,
  CaseFileOption,
  CaseOption,
  Field,
  IndexSpec,
  Relation,
  TableData,
  TSField
} from '../Types'
import type { DialectOptions, FKSpec } from '../Dialects/Options'

/** Generates text from each table in TableData */
export class MigrationGenerator {
  dialect: DialectOptions
  tables: { [tableName: string]: { [fieldName: string]: ColumnDescription; }; }
  foreignKeys: { [tableName: string]: { [fieldName: string]: FKSpec; }; }
  hasTriggerTables: { [tableName: string]: boolean; }
  indexes: { [tableName: string]: IndexSpec[]; }
  relations: Relation[]
  space: string[]
  options: {
    indentation?: number;
    spaces?: boolean;
    caseModel?: CaseOption;
    caseProp?: CaseOption;
    caseFile?: CaseFileOption;
    skipFields?: string[];
    additional?: any;
    schema?: string;
    singularize: boolean;
    useDefine: boolean;
    noIndexes?: boolean;
  }

  constructor(tableData: TableData, dialect: DialectOptions, options: AutoOptions) {
    this.tables = tableData.tables
    this.foreignKeys = tableData.foreignKeys
    this.hasTriggerTables = tableData.hasTriggerTables
    this.indexes = tableData.indexes
    this.relations = tableData.relations
    this.dialect = dialect
    this.options = options
    this.space = MakeIndent(this.options.spaces, this.options.indentation)
  }

  MakeHeaderTemplate() {
    let header = ''

    header += 'import * as Sequelize from \'sequelize\';\n'
    header += 'import { DataTypes, Model, Optional } from \'sequelize\';\n'

    return header
  }

  GenerateText() {
    const tableNames = Object.keys(this.tables)

    const header = this.MakeHeaderTemplate()

    const text: { [name: string]: string; } = {}
    tableNames.forEach(table => {
      let str = header
      const [schemaName, tableNameOrig] = qNameSplit(table)
      const tableName = MakeTableName(this.options.caseModel, tableNameOrig, this.options.singularize)

      const associations = this.AddTypeScriptAssociationMixins(table)
      const needed = Object.keys(associations.needed).sort()
      needed.forEach(fkTable => {
        const set = associations.needed[fkTable]
        const [fkSchema, fkTableName] = qNameSplit(fkTable)
        const filename = recase(this.options.caseFile, fkTableName, this.options.singularize)
        str += `import type { ${Array.from(set.values()).sort().join(', ')} } from './${filename}';\n`
      })

      str += '\nexport interface #TABLE#Attributes {\n'
      str += this.AddTypeScriptFields(table, true) + '}\n\n'

      const primaryKeys = this.GetTypeScriptPrimaryKeys(table)

      if (primaryKeys.length) {
        str += `export type #TABLE#Pk = ${primaryKeys.map((k) => `"${recase(this.options.caseProp, k)}"`).join(' | ')};\n`
        str += `export type #TABLE#Id = #TABLE#[#TABLE#Pk];\n`
      }

      const creationOptionalFields = this.GetTypeScriptCreationOptionalFields(table)

      if (creationOptionalFields.length) {
        str += `export type #TABLE#OptionalAttributes = ${creationOptionalFields.map((k) => `"${recase(this.options.caseProp, k)}"`).join(' | ')};\n`
        str += 'export type #TABLE#CreationAttributes = Optional<#TABLE#Attributes, #TABLE#OptionalAttributes>;\n\n'
      } else {
        str += 'export type #TABLE#CreationAttributes = #TABLE#Attributes;\n\n'
      }

      str += 'export class #TABLE# extends Model<#TABLE#Attributes, #TABLE#CreationAttributes> implements #TABLE#Attributes {\n'
      str += this.AddTypeScriptFields(table, false)
      str += '\n' + associations.str
      str += `\n${this.space[1]}static initModel(sequelize: Sequelize.Sequelize): typeof #TABLE# {\n`

      if (this.options.useDefine) {
        str += `${this.space[2]}return sequelize.define('#TABLE#', {\n`
      } else {
        str += `${this.space[2]}return #TABLE#.init({\n`
      }

      str += this.AddTable(table)

      if (this.options.useDefine) {
        str += ') as typeof #TABLE#;\n'
      } else {
        str += ');\n'
      }

      if (this.options.useDefine) {
        str += `${this.space[1]}}\n}\n`
      } else {
        str += `${this.space[1]}}\n}\n`
      }

      const re = new RegExp('#TABLE#', 'g')
      str = str.replace(re, tableName)

      text[table] = str
    })

    return text
  }

  private AddTable(table: string) {
    const [schemaName, tableNameOrig] = qNameSplit(table)
    const space = this.space
    let timestamps = (this.options.additional && this.options.additional.timestamps === true) || false
    let paranoid = (this.options.additional && this.options.additional.paranoid === true) || false

    // Add all the fields
    let str = ''
    const fields = Object.keys(this.tables[table]) // Use Object.keys() instead of _.keys()
    fields.forEach((field) => {
      timestamps ||= this.IsTimestampField(field)
      paranoid ||= this.IsParanoidField(field)

      str += this.AddField(table, field)
    })

    // Trim off last ",\n"
    str = str.slice(0, -2) + '\n'

    // Add the table options
    str += `${space[1]}}}, {\n`
    if (!this.options.useDefine) {
      str += `${space[2]}sequelize,\n`
    }
    str += `${space[2]}tableName: '${tableNameOrig}',\n`

    if (schemaName && this.dialect.hasSchema) {
      str += `${space[2]}schema: '${schemaName}',\n`
    }

    if (this.hasTriggerTables[table]) {
      str += `${space[2]}hasTrigger: true,\n`
    }

    str += `${space[2]}timestamps: ${timestamps},\n`
    if (paranoid) {
      str += `${space[2]}paranoid: true,\n`
    }

    // Conditionally add additional options
    if (this.options.additional && Object.keys(this.options.additional).length > 0) {
      for (const [key, value] of Object.entries(this.options.additional)) { // Replace _.each() with for...of
        if (key === 'name') {
          // name: true - preserve table name always
          str += `${space[2]}name: {\n`
          str += `${space[3]}singular: '${table}',\n`
          str += `${space[3]}plural: '${table}'\n`
          str += `${space[2]}},\n`
        } else if (key !== 'timestamps' && key !== 'paranoid') {
          const formattedValue = typeof value === 'boolean' ? value : `'${value}'`
          str += `${space[2]}${key}: ${formattedValue},\n`
        }
      }
    }

    // Add indexes
    if (!this.options.noIndexes) {
      str += this.AddIndexes(table)
    }

    str = `${space[2]}${str.trim()}`
    str = str.slice(0, -1) + '\n' + space[1] + '}'

    return str
  }

  // Create a string containing field attributes (type, defaultValue, etc.)
  private AddField(table: string, field: string): string {

    // ignore Sequelize standard fields
    const additional = this.options.additional
    if (additional && (additional.timestamps !== false) && (this.IsTimestampField(field) || this.IsParanoidField(field))) {
      return ''
    }

    if (this.isIgnoredField(field)) {
      return ''
    }

    // Find foreign key
    const foreignKey = this.foreignKeys[table] && this.foreignKeys[table][field] ? this.foreignKeys[table][field] : null
    const fieldObj = this.tables[table][field] as Field

    if (_.isObject(foreignKey)) {
      fieldObj.foreignKey = foreignKey
    }

    const fieldName = recase(this.options.caseProp, field)
    let str = this.QuoteName(fieldName) + ': {\n'

    const quoteWrapper = '"'

    const unique = fieldObj.unique || fieldObj.foreignKey && fieldObj.foreignKey.isUnique

    const isSerialKey = (fieldObj.foreignKey && fieldObj.foreignKey.isSerialKey) ||
      this.dialect.isSerialKey && this.dialect.isSerialKey(fieldObj)

    let wroteAutoIncrement = false
    const space = this.space

    // column's attributes
    const fieldAttrs = _.keys(fieldObj)
    fieldAttrs.forEach(attr => {

      // We don't need the special attribute from postgresql; "unique" is handled separately
      if (attr === 'special' || attr === 'elementType' || attr === 'unique') {
        return true
      }

      if (isSerialKey && !wroteAutoIncrement) {
        str += space[3] + 'autoIncrement: true,\n'
        // Resort to Postgres' GENERATED BY DEFAULT AS IDENTITY instead of SERIAL
        if (this.dialect.name === 'postgres' && fieldObj.foreignKey && fieldObj.foreignKey.isPrimaryKey === true &&
          (fieldObj.foreignKey.generation === 'ALWAYS' || fieldObj.foreignKey.generation === 'BY DEFAULT')) {
          str += space[3] + 'autoIncrementIdentity: true,\n'
        }
        wroteAutoIncrement = true
      }

      if (attr === 'foreignKey') {
        if (foreignKey && foreignKey.isForeignKey) {
          str += space[3] + 'references: {\n'
          str += space[4] + 'model: \'' + fieldObj[attr].foreignSources.target_table + '\',\n'
          str += space[4] + 'key: \'' + fieldObj[attr].foreignSources.target_column + '\'\n'
          str += space[3] + '}'
        } else {
          return true
        }
      } else if (attr === 'references') {
        // covered by foreignKey
        return true
      } else if (attr === 'primaryKey') {
        if (fieldObj[attr] === true && (!_.has(fieldObj, 'foreignKey') || !!fieldObj.foreignKey.isPrimaryKey)) {
          str += space[3] + 'primaryKey: true'
        } else {
          return true
        }
      } else if (attr === 'autoIncrement') {
        if (fieldObj[attr] === true && !wroteAutoIncrement) {
          str += space[3] + 'autoIncrement: true,\n'
          // Resort to Postgres' GENERATED BY DEFAULT AS IDENTITY instead of SERIAL
          if (this.dialect.name === 'postgres' && fieldObj.foreignKey && fieldObj.foreignKey.isPrimaryKey === true && (fieldObj.foreignKey.generation === 'ALWAYS' || fieldObj.foreignKey.generation === 'BY DEFAULT')) {
            str += space[3] + 'autoIncrementIdentity: true,\n'
          }
          wroteAutoIncrement = true
        }
        return true
      } else if (attr === 'allowNull') {
        str += space[3] + attr + ': ' + fieldObj[attr]
      } else if (attr === 'defaultValue') {
        let defaultVal = fieldObj.defaultValue
        if (this.dialect.name === 'mssql' && defaultVal && defaultVal.toLowerCase() === '(newid())') {
          defaultVal = null as any // disable adding "default value" attribute for UUID fields if generating for MS SQL
        }
        if (this.dialect.name === 'mssql' && (['(NULL)', 'NULL'].includes(defaultVal) || typeof defaultVal === 'undefined')) {
          defaultVal = null as any // Override default NULL in MS SQL to javascript null
        }

        if (defaultVal === null || defaultVal === undefined) {
          return true
        }
        if (isSerialKey) {
          return true // value generated in the database
        }

        let val_text = defaultVal
        if (_.isString(defaultVal)) {
          const field_type = fieldObj.type.toLowerCase()
          defaultVal = this.escapeSpecial(defaultVal)

          while (defaultVal.startsWith('(') && defaultVal.endsWith(')')) {
            // remove extra parens around mssql defaults
            defaultVal = defaultVal.replace(/^[(]/, '').replace(/[)]$/, '')
          }

          if (field_type === 'bit(1)' || field_type === 'bit' || field_type === 'boolean') {
            // convert string to boolean
            val_text = /1|true/i.test(defaultVal) ? 'true' : 'false'

          } else if (this.IsArray(field_type)) {
            // remove outer {}
            val_text = defaultVal.replace(/^{/, '').replace(/}$/, '')
            if (val_text && this.isString(fieldObj.elementType)) {
              // quote the array elements
              val_text = val_text.split(',').map(s => `"${s}"`).join(',')
            }
            val_text = `[${val_text}]`

          } else if (field_type.match(/^(json)/)) {
            // don't quote json
            val_text = defaultVal

          } else if (field_type === 'uuid' && (defaultVal === 'gen_random_uuid()' || defaultVal === 'uuid_generate_v4()')) {
            val_text = 'DataTypes.UUIDV4'

          } else if (defaultVal.match(/\w+\(\)$/)) {
            // replace db function with sequelize function
            val_text = 'Sequelize.Sequelize.fn(\'' + defaultVal.replace(/\(\)$/g, '') + '\')'

          } else if (this.IsNumber(field_type)) {
            if (defaultVal.match(/\(\)/g)) {
              // assume it's a server function if it contains parens
              val_text = 'Sequelize.Sequelize.literal(\'' + defaultVal + '\')'
            } else {
              // don't quote numbers
              val_text = defaultVal
            }

          } else if (defaultVal.match(/\(\)/g)) {
            // embedded function, pass as literal
            val_text = 'Sequelize.Sequelize.literal(\'' + defaultVal + '\')'

          } else if (field_type.indexOf('date') === 0 || field_type.indexOf('timestamp') === 0) {
            if (_.includes(['current_timestamp', 'current_date', 'current_time', 'localtime', 'localtimestamp'], defaultVal.toLowerCase())) {
              val_text = 'Sequelize.Sequelize.literal(\'' + defaultVal + '\')'
            } else {
              val_text = quoteWrapper + defaultVal + quoteWrapper
            }

          } else {
            val_text = quoteWrapper + defaultVal + quoteWrapper
          }
        }

        str += space[3] + attr + ': ' + val_text

      } else if (attr === 'comment' && (!fieldObj[attr] || this.dialect.name === 'mssql')) {
        return true
      } else {
        let val = (attr !== 'type') ? null : this.GetSqType(fieldObj, attr)
        if (val == null) {
          val = (fieldObj as any)[attr]
          val = _.isString(val) ? quoteWrapper + this.escapeSpecial(val) + quoteWrapper : val
        }
        str += space[3] + attr + ': ' + val
      }

      str += ',\n'
    })

    if (unique) {
      const uniq = _.isString(unique) ? quoteWrapper + unique.replace(/\"/g, '\\"') + quoteWrapper : unique
      str += space[3] + 'unique: ' + uniq + ',\n'
    }

    if (field !== fieldName) {
      str += space[3] + 'field: \'' + field + '\',\n'
    }

    // removes the last `,` within the attribute options
    str = str.trim().replace(/,+$/, '') + '\n'
    str = space[2] + str + space[2] + '},\n'
    return str
  }

  private AddIndexes(table: string) {
    const indexes = this.indexes[table]
    const space = this.space
    let str = ''
    if (indexes && indexes.length) {
      str += space[2] + 'indexes: [\n'
      indexes.forEach(idx => {
        str += space[3] + '{\n'
        if (idx.name) {
          str += space[4] + `name: "${idx.name}",\n`
        }
        if (idx.unique) {
          str += space[4] + 'unique: true,\n'
        }
        if (idx.type) {
          if (['UNIQUE', 'FULLTEXT', 'SPATIAL'].includes(idx.type)) {
            str += space[4] + `type: "${idx.type}",\n`
          } else {
            str += space[4] + `using: "${idx.type}",\n`
          }
        }
        str += space[4] + `fields: [\n`
        idx.fields.forEach(ff => {
          str += space[5] + `{ name: "${ff.attribute}"`
          if (ff.collate) {
            str += `, collate: "${ff.collate}"`
          }
          if (ff.length) {
            str += `, length: ${ff.length}`
          }
          if (ff.order && ff.order !== 'ASC') {
            str += `, order: "${ff.order}"`
          }
          str += ' },\n'
        })
        str += space[4] + ']\n'
        str += space[3] + '},\n'
      })
      str += space[2] + '],\n'
    }
    return str
  }

  /** Get the sequelize type from the Field */
  private GetSqType(fieldObj: Field, attr: string): string {
    const attrValue = (fieldObj as any)[attr]
    if (!attrValue.toLowerCase) {
      console.log('attrValue', attr, attrValue)
      return attrValue
    }
    const type: string = attrValue.toLowerCase()
    const length = type.match(/\(\d+\)/)
    const precision = type.match(/\(\d+,\d+\)/)
    let val = null
    let typematch = null

    if (type === 'boolean' || type === 'bit(1)' || type === 'bit' || type === 'tinyint(1)') {
      val = 'DataTypes.BOOLEAN'

      // postgres range types
    } else if (type === 'numrange') {
      val = 'DataTypes.RANGE(DataTypes.DECIMAL)'
    } else if (type === 'int4range') {
      val = 'DataTypes.RANGE(DataTypes.INTEGER)'
    } else if (type === 'int8range') {
      val = 'DataTypes.RANGE(DataTypes.BIGINT)'
    } else if (type === 'daterange') {
      val = 'DataTypes.RANGE(DataTypes.DATEONLY)'
    } else if (type === 'tsrange' || type === 'tstzrange') {
      val = 'DataTypes.RANGE(DataTypes.DATE)'

    } else if (typematch = type.match(/^(bigint|smallint|mediumint|tinyint|int)/)) {
      // integer subtypes
      val = 'DataTypes.' + (typematch[0] === 'int' ? 'INTEGER' : typematch[0].toUpperCase())
      if (/unsigned/i.test(type)) {
        val += '.UNSIGNED'
      }
      if (/zerofill/i.test(type)) {
        val += '.ZEROFILL'
      }
    } else if (type === 'nvarchar(max)' || type === 'varchar(max)') {
      val = 'DataTypes.TEXT'
    } else if (type.match(/n?varchar|string|varying/)) {
      val = 'DataTypes.STRING' + (!_.isNull(length) ? length : '')
    } else if (type.match(/^n?char/)) {
      val = 'DataTypes.CHAR' + (!_.isNull(length) ? length : '')
    } else if (type.match(/^real/)) {
      val = 'DataTypes.REAL'
    } else if (type.match(/text$/)) {
      val = 'DataTypes.TEXT' + (!_.isNull(length) ? length : '')
    } else if (type === 'date') {
      val = 'DataTypes.DATEONLY'
    } else if (type.match(/^(date|timestamp|year)/)) {
      val = 'DataTypes.DATE' + (!_.isNull(length) ? length : '')
    } else if (type.match(/^(time)/)) {
      val = 'DataTypes.TIME'
    } else if (type.match(/^(float|float4)/)) {
      val = 'DataTypes.FLOAT' + (!_.isNull(precision) ? precision : '')
    } else if (type.match(/^(decimal|numeric)/)) {
      val = 'DataTypes.DECIMAL' + (!_.isNull(precision) ? precision : '')
    } else if (type.match(/^money/)) {
      val = 'DataTypes.DECIMAL(19,4)'
    } else if (type.match(/^smallmoney/)) {
      val = 'DataTypes.DECIMAL(10,4)'
    } else if (type.match(/^(float8|double)/)) {
      val = 'DataTypes.DOUBLE' + (!_.isNull(precision) ? precision : '')
    } else if (type.match(/^uuid|uniqueidentifier/)) {
      val = 'DataTypes.UUID'
    } else if (type.match(/^jsonb/)) {
      val = 'DataTypes.JSONB'
    } else if (type.match(/^json/)) {
      val = 'DataTypes.JSON'
    } else if (type.match(/^geometry/)) {
      const gtype = fieldObj.elementType ? `(${fieldObj.elementType})` : ''
      val = `DataTypes.GEOMETRY${gtype}`
    } else if (type.match(/^geography/)) {
      const gtype = fieldObj.elementType ? `(${fieldObj.elementType})` : ''
      val = `DataTypes.GEOGRAPHY${gtype}`
    } else if (type.match(/^array/)) {
      const eltype = this.GetSqType(fieldObj, 'elementType')
      val = `DataTypes.ARRAY(${eltype})`
    } else if (type.match(/(binary|image|blob|bytea)/)) {
      val = 'DataTypes.BLOB'
    } else if (type.match(/^hstore/)) {
      val = 'DataTypes.HSTORE'
    } else if (type.match(/^inet/)) {
      val = 'DataTypes.INET'
    } else if (type.match(/^cidr/)) {
      val = 'DataTypes.CIDR'
    } else if (type.match(/^oid/)) {
      val = 'DataTypes.INTEGER'
    } else if (type.match(/^macaddr/)) {
      val = 'DataTypes.MACADDR'
    } else if (type.match(/^enum(\(.*\))?$/)) {
      const enumValues = this.GetEnumValues(fieldObj)
      val = `DataTypes.ENUM(${enumValues})`
    }

    return val as string
  }

  private GetTypeScriptPrimaryKeys(table: string): Array<string> {
    const fields = _.keys(this.tables[table])
    return fields.filter((field): boolean => {
      const fieldObj = this.tables[table][field]
      return fieldObj['primaryKey']
    })
  }

  private GetTypeScriptCreationOptionalFields(table: string): Array<string> {
    const fields = _.keys(this.tables[table])
    return fields.filter((field): boolean => {
      const fieldObj = this.tables[table][field]
      return fieldObj.allowNull || (!!fieldObj.defaultValue || fieldObj.defaultValue === '') || fieldObj.autoIncrement
        || this.IsTimestampField(field)
    })
  }

  /** Add schema to table so it will match the relation data.  Fixes mysql problem. */
  private AddSchemaForRelations(table: string) {
    if (!table.includes('.') && !this.relations.some(rel => rel.childTable === table)) {
      // if no tables match the given table, then assume we need to fix the schema
      const first = this.relations.find(rel => !!rel.childTable)
      if (first) {
        const [schemaName, tableName] = qNameSplit(first.childTable)
        if (schemaName) {
          table = qNameJoin(schemaName, table)
        }
      }
    }
    return table
  }

  private AddTypeScriptAssociationMixins(table: string): Record<string, any> {
    const sp = this.space[1]
    const needed: Record<string, Set<String>> = {}
    let str = ''

    table = this.AddSchemaForRelations(table)

    this.relations.forEach(rel => {
      if (!rel.isM2M) {
        if (rel.childTable === table) {
          // current table is a child that belongsTo parent
          const pparent = _.upperFirst(rel.parentProp)
          str += `${sp}// ${rel.childModel} belongsTo ${rel.parentModel} via ${rel.parentId}\n`
          str += `${sp}${rel.parentProp}!: ${rel.parentModel};\n`
          str += `${sp}get${pparent}!: Sequelize.BelongsToGetAssociationMixin<${rel.parentModel}>;\n`
          str += `${sp}set${pparent}!: Sequelize.BelongsToSetAssociationMixin<${rel.parentModel}, ${rel.parentModel}Id>;\n`
          str += `${sp}create${pparent}!: Sequelize.BelongsToCreateAssociationMixin<${rel.parentModel}>;\n`
          needed[rel.parentTable] ??= new Set()
          needed[rel.parentTable].add(rel.parentModel)
          needed[rel.parentTable].add(rel.parentModel + 'Id')
        } else if (rel.parentTable === table) {
          needed[rel.childTable] ??= new Set()
          const pchild = _.upperFirst(rel.childProp)
          if (rel.isOne) {
            // const hasModelSingular = singularize(hasModel);
            str += `${sp}// ${rel.parentModel} hasOne ${rel.childModel} via ${rel.parentId}\n`
            str += `${sp}${rel.childProp}!: ${rel.childModel};\n`
            str += `${sp}get${pchild}!: Sequelize.HasOneGetAssociationMixin<${rel.childModel}>;\n`
            str += `${sp}set${pchild}!: Sequelize.HasOneSetAssociationMixin<${rel.childModel}, ${rel.childModel}Id>;\n`
            str += `${sp}create${pchild}!: Sequelize.HasOneCreateAssociationMixin<${rel.childModel}>;\n`
            needed[rel.childTable].add(rel.childModel)
            needed[rel.childTable].add(`${rel.childModel}Id`)
            needed[rel.childTable].add(`${rel.childModel}CreationAttributes`)
          } else {
            const hasModel = rel.childModel
            const sing = _.upperFirst(singularize(rel.childProp))
            const lur = pluralize(rel.childProp)
            const plur = _.upperFirst(lur)
            str += `${sp}// ${rel.parentModel} hasMany ${rel.childModel} via ${rel.parentId}\n`
            str += `${sp}${lur}!: ${rel.childModel}[];\n`
            str += `${sp}get${plur}!: Sequelize.HasManyGetAssociationsMixin<${hasModel}>;\n`
            str += `${sp}set${plur}!: Sequelize.HasManySetAssociationsMixin<${hasModel}, ${hasModel}Id>;\n`
            str += `${sp}add${sing}!: Sequelize.HasManyAddAssociationMixin<${hasModel}, ${hasModel}Id>;\n`
            str += `${sp}add${plur}!: Sequelize.HasManyAddAssociationsMixin<${hasModel}, ${hasModel}Id>;\n`
            str += `${sp}create${sing}!: Sequelize.HasManyCreateAssociationMixin<${hasModel}>;\n`
            str += `${sp}remove${sing}!: Sequelize.HasManyRemoveAssociationMixin<${hasModel}, ${hasModel}Id>;\n`
            str += `${sp}remove${plur}!: Sequelize.HasManyRemoveAssociationsMixin<${hasModel}, ${hasModel}Id>;\n`
            str += `${sp}has${sing}!: Sequelize.HasManyHasAssociationMixin<${hasModel}, ${hasModel}Id>;\n`
            str += `${sp}has${plur}!: Sequelize.HasManyHasAssociationsMixin<${hasModel}, ${hasModel}Id>;\n`
            str += `${sp}count${plur}!: Sequelize.HasManyCountAssociationsMixin;\n`
            needed[rel.childTable].add(hasModel)
            needed[rel.childTable].add(`${hasModel}Id`)
          }
        }
      } else {
        // rel.isM2M
        if (rel.parentTable === table) {
          // many-to-many
          const isParent = (rel.parentTable === table)
          const thisModel = isParent ? rel.parentModel : rel.childModel
          const otherModel = isParent ? rel.childModel : rel.parentModel
          const otherModelSingular = _.upperFirst(singularize(isParent ? rel.childProp : rel.parentProp))
          const lotherModelPlural = pluralize(isParent ? rel.childProp : rel.parentProp)
          const otherModelPlural = _.upperFirst(lotherModelPlural)
          const otherTable = isParent ? rel.childTable : rel.parentTable
          str += `${sp}// ${thisModel} belongsToMany ${otherModel} via ${rel.parentId} and ${rel.childId}\n`
          str += `${sp}${lotherModelPlural}!: ${otherModel}[];\n`
          str += `${sp}get${otherModelPlural}!: Sequelize.BelongsToManyGetAssociationsMixin<${otherModel}>;\n`
          str += `${sp}set${otherModelPlural}!: Sequelize.BelongsToManySetAssociationsMixin<${otherModel}, ${otherModel}Id>;\n`
          str += `${sp}add${otherModelSingular}!: Sequelize.BelongsToManyAddAssociationMixin<${otherModel}, ${otherModel}Id>;\n`
          str += `${sp}add${otherModelPlural}!: Sequelize.BelongsToManyAddAssociationsMixin<${otherModel}, ${otherModel}Id>;\n`
          str += `${sp}create${otherModelSingular}!: Sequelize.BelongsToManyCreateAssociationMixin<${otherModel}>;\n`
          str += `${sp}remove${otherModelSingular}!: Sequelize.BelongsToManyRemoveAssociationMixin<${otherModel}, ${otherModel}Id>;\n`
          str += `${sp}remove${otherModelPlural}!: Sequelize.BelongsToManyRemoveAssociationsMixin<${otherModel}, ${otherModel}Id>;\n`
          str += `${sp}has${otherModelSingular}!: Sequelize.BelongsToManyHasAssociationMixin<${otherModel}, ${otherModel}Id>;\n`
          str += `${sp}has${otherModelPlural}!: Sequelize.BelongsToManyHasAssociationsMixin<${otherModel}, ${otherModel}Id>;\n`
          str += `${sp}count${otherModelPlural}!: Sequelize.BelongsToManyCountAssociationsMixin;\n`
          needed[otherTable] ??= new Set()
          needed[otherTable].add(otherModel)
          needed[otherTable].add(`${otherModel}Id`)
        }
      }
    })
    if (needed[table]) {
      delete needed[table] // don't add import for self
    }
    return { needed, str }
  }

  private AddTypeScriptFields(table: string, isInterface: boolean) {
    const sp = this.space[1]
    const fields = _.keys(this.tables[table])
    const notNull = isInterface ? '' : '!'
    let str = ''
    fields.forEach(field => {
      if (!this.options.skipFields || !this.options.skipFields.includes(field)) {
        const name = this.QuoteName(recase(this.options.caseProp, field))
        const isOptional = this.GetTypeScriptFieldOptional(table, field)
        str += `${sp}${name}${isOptional ? '?' : notNull}: ${this.GetTypeScriptType(table, field)};\n`
      }
    })
    return str
  }

  private GetTypeScriptFieldOptional(table: string, field: string) {
    const fieldObj = this.tables[table][field]
    return fieldObj.allowNull
  }

  private GetTypeScriptType(table: string, field: string) {
    const fieldObj = this.tables[table][field] as TSField
    return this.GetTypeScriptFieldType(fieldObj, 'type')
  }

  private GetTypeScriptFieldType(fieldObj: TSField, attr: keyof TSField) {
    const rawFieldType = fieldObj[attr] || ''
    const fieldType = String(rawFieldType).toLowerCase()

    let jsType: string

    if (this.IsArray(fieldType)) {
      const eltype = this.GetTypeScriptFieldType(fieldObj, 'elementType')
      jsType = eltype + '[]'
    } else if (this.IsNumber(fieldType)) {
      jsType = 'number'
    } else if (this.IsBoolean(fieldType)) {
      jsType = 'boolean'
    } else if (this.IsDate(fieldType)) {
      jsType = 'Date'
    } else if (this.isString(fieldType)) {
      jsType = 'string'
    } else if (this.IsEnum(fieldType)) {
      const values = this.GetEnumValues(fieldObj)
      jsType = values.join(' | ')
    } else if (this.IsJSON(fieldType)) {
      jsType = 'object'
    } else {
      console.log(`Missing TypeScript type: ${fieldType || fieldObj['type']}`)
      jsType = 'any'
    }
    return jsType
  }

  private GetEnumValues(fieldObj: TSField): string[] {
    if (fieldObj.special) {
      // postgres
      return fieldObj.special.map((v) => `"${v}"`)
    } else {
      // mysql
      return fieldObj.type.substring(5, fieldObj.type.length - 1).split(',')
    }
  }

  private IsTimestampField(field: string) {
    const additional = this.options.additional
    if (additional.timestamps === false) {
      return false
    }
    return ((!additional.createdAt && recase('c', field) === 'createdAt') || additional.createdAt === field)
      || ((!additional.updatedAt && recase('c', field) === 'updatedAt') || additional.updatedAt === field)
  }

  private IsParanoidField(field: string) {
    const additional = this.options.additional
    if (additional.timestamps === false || additional.paranoid === false) {
      return false
    }
    return ((!additional.deletedAt && recase('c', field) === 'deletedAt') || additional.deletedAt === field)
  }

  private isIgnoredField(field: string) {
    return (this.options.skipFields && this.options.skipFields.includes(field))
  }

  private escapeSpecial(val: string) {
    return val
      .replace(/[\\]/g, '\\\\')
      .replace(/[\"]/g, '\\"')
      .replace(/[\/]/g, '\\/')
      .replace(/[\b]/g, '\\b')
      .replace(/[\f]/g, '\\f')
      .replace(/[\n]/g, '\\n')
      .replace(/[\r]/g, '\\r')
      .replace(/[\t]/g, '\\t')
  }

  /** Quote the name if it is not a valid identifier */
  private QuoteName(name: string) {
    return (/^[$A-Z_][0-9A-Z_$]*$/i.test(name) ? name : '\'' + name + '\'')
  }

  private IsNumber(fieldType: string): boolean {
    return /^(smallint|mediumint|tinyint|int|bigint|float|money|smallmoney|double|decimal|numeric|real|oid)/.test(fieldType)
  }

  private IsBoolean(fieldType: string): boolean {
    return /^(boolean|bit)/.test(fieldType)
  }

  private IsDate(fieldType: string): boolean {
    return /^(datetime|timestamp)/.test(fieldType)
  }

  private isString(fieldType: string): boolean {
    return /^(char|nchar|string|varying|varchar|nvarchar|text|longtext|mediumtext|tinytext|ntext|uuid|uniqueidentifier|date|time|inet|cidr|macaddr)/.test(fieldType)
  }

  private IsArray(fieldType: string): boolean {
    return /(^array)|(range$)/.test(fieldType)
  }

  private IsEnum(fieldType: string): boolean {
    return /^(enum)/.test(fieldType)
  }

  private IsJSON(fieldType: string): boolean {
    return /^(json|jsonb)/.test(fieldType)
  }
}
