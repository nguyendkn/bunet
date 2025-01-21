import _ from 'lodash'
import { Dialects } from '../Dialects'
import { MigrationRelater } from './MigrationRelater'
import { MigrationWriter } from './MigrationWriter'
import { type AutoOptions, MigrationBuilder, MigrationGenerator, type TableData } from '@/bunet/core'
import { type Dialect, Sequelize } from 'sequelize'

export class MigrationAuto {
  sequelize: Sequelize
  options: AutoOptions

  constructor(sequelize: Sequelize, options: AutoOptions) {
    if (options && options.dialect === 'sqlite' && !options.storage) {
      options.storage = sequelize.getDatabaseName()
    }
    if (options && options.dialect === 'mssql') {
      // set defaults for tedious, to silence the warnings
      options.dialectOptions = options.dialectOptions || {}
      options.dialectOptions.options = options.dialectOptions.options || {}
      options.dialectOptions.options.trustServerCertificate = true
      options.dialectOptions.options.enableArithAbort = true
      options.dialectOptions.options.validateBulkLoadParameters = true
    }

    this.sequelize = sequelize

    this.options = _.extend({
      spaces: true,
      indentation: 2,
      directory: './models',
      additional: {},
      host: 'localhost',
      port: this.GetDefaultPort(options.dialect),
      closeConnectionAutomatically: true
    }, options || {})

    if (!this.options.directory) {
      this.options.noWrite = true
    }

  }

  async RunAsync(): Promise<TableData> {
    let tableData = await this.BuildAsync()
    tableData = this.Relate(tableData)
    tableData.text = this.Generate(tableData)
    await this.Write(tableData)
    return tableData
  }

  async BuildAsync(): Promise<TableData> {
    const builder = new MigrationBuilder(this.sequelize, this.options)
    let tableData = await builder.build()
    if (this.options.closeConnectionAutomatically) {
      await this.sequelize.close()
      return tableData

    }
    return tableData
  }

  Relate(td: TableData): TableData {
    const relater = new MigrationRelater(this.options)
    return relater.buildRelations(td)
  }

  Generate(tableData: TableData) {
    const dialect = Dialects[this.sequelize.getDialect() as Dialect]
    const generator = new MigrationGenerator(tableData, dialect, this.options)
    return generator.GenerateText()
  }

  Write(tableData: TableData) {
    const writer = new MigrationWriter(tableData, this.options)
    return writer.write()
  }

  GetDefaultPort(dialect?: Dialect) {
    switch (dialect) {
      case 'mssql':
        return 1433
      case 'postgres':
        return 5432
      default:
        return 3306
    }
  }
}