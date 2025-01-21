import fs from 'fs'
import _ from 'lodash'
import path from 'path'
import util from 'util'
import prettier from 'prettier'
import { mkdir } from 'node:fs/promises'
import type { FKSpec } from '../Dialects/Options'
import {
  type AutoOptions,
  type CaseFileOption,
  type CaseOption,
  type Relation,
  MakeIndent,
  MakeTableName,
  pluralize,
  qNameSplit,
  reCase,
  TableData
} from '@/bunet/core'

/** Writes text into files from TableData.text, and writes init-models */
export class MigrationWriter {
  tableText: { [name: string]: string }
  foreignKeys: { [tableName: string]: { [fieldName: string]: FKSpec } }
  relations: Relation[]
  space: string[]
  options: {
    caseFile?: CaseFileOption;
    caseModel?: CaseOption;
    caseProp?: CaseOption;
    directory: string;
    noAlias?: boolean;
    noInitModels?: boolean;
    noWrite?: boolean;
    singularize?: boolean;
    useDefine?: boolean;
    spaces?: boolean;
    indentation?: number;
  }

  constructor(tableData: TableData, options: AutoOptions) {
    this.tableText = tableData.text as { [name: string]: string }
    this.foreignKeys = tableData.foreignKeys
    this.relations = tableData.relations
    this.options = options
    this.space = MakeIndent(this.options.spaces, this.options.indentation)
  }

  async write() {
    if (this.options.noWrite) return

    const modelsDirectory = path.resolve(this.options.directory || './models')
    await mkdir(modelsDirectory)

    const tableNames = _.keys(this.tableText)
    const writeFilePromises = tableNames.map(table => this.createFile(table))

    await Promise.all(writeFilePromises)
  }

  private async writeFile(filePath: string, content: string) {
    const formattedContent = await prettier.format(content, {
      'parser': 'typescript',
      'arrowParens': 'always',
      'semi': false,
      'trailingComma': 'none',
      'tabWidth': 2,
      'endOfLine': 'auto',
      'useTabs': false,
      'singleQuote': true,
      'printWidth': 120,
      'jsxSingleQuote': true
    })

    const writeFile = util.promisify(fs.writeFile)
    await writeFile(path.resolve(filePath), formattedContent)
  }

  private createFile(table: string) {
    const [schemaName, tableName] = qNameSplit(table)
    const fileName = reCase(this.options.caseFile, tableName, this.options.singularize)
    const filePath = path.join(this.options.directory, fileName + '.ts')

    return this.writeFile(filePath, this.createModelFileContent(table, tableName as string, fileName))
  }

  private createModelFileContent(table: string, tableName: string, fileName: string) {
    const modelName = MakeTableName(this.options.caseModel, tableName, this.options.singularize)
    return `
            import { uuidv7 } from '@/bunet/core'
            import { DataTypes, Model, Sequelize, type Optional } from 'sequelize'
            
            export interface I${modelName} {
              ${this.generateAttributes(table)}
            }
            
            export interface I${modelName}CreationAttributes extends Optional<I${modelName}, 'id'> {}
            
            export class ${modelName}Model extends Model<I${modelName}, I${modelName}CreationAttributes> {
              static Definition(sequelize: Sequelize, modelName: string, tableName: string): typeof ${modelName}Model {
                ${modelName}Model.init(
                  {
                    ${this.generateFields(tableName)}
                  },
                  {
                    sequelize,
                    modelName,
                    tableName,
                    timestamps: true,
                    hooks: {
                      beforeCreate: (instance) => {
                        console.log('Creating instance:', instance.get({ plain: true }))
                      },
                      afterCreate: (instance) => {
                        console.log('Instance created')
                      }
                    }
                  }
                )
                return ${modelName}Model
              }
            }
            `
  }

  private generateAttributes(table: string) {
    // Tạo danh sách các thuộc tính của bảng từ thông tin bảng
    const fields = this.foreignKeys[table] || {}
    const attributes = [] as string[]
    Object.keys(fields).forEach(field => {
      attributes.push(`${field}: string`)  // Cải tiến logic xác định kiểu cho các trường
    })
    return attributes.join('\n  ')
  }

  private generateFields(tableName: string) {
    // Tạo danh sách các trường với kiểu dữ liệu cho Sequelize
    const fields = this.foreignKeys[tableName] || {}
    const fieldStrings = []

    fieldStrings.push(`
        id: {
          type: DataTypes.STRING(32),
          defaultValue: (): string => uuidv7(true),
          primaryKey: true
        },
    `)

    Object.keys(fields).forEach(field => {
      fieldStrings.push(`
        ${field}: {
          type: DataTypes.STRING,
          allowNull: false
        },
      `)
    })

    return fieldStrings.join('')
  }

  /** Create the belongsToMany/belongsTo/hasMany/hasOne association strings */
  private createAssociations() {
    const strBelongsToMany = this.createBelongsToManyAssociations()
    const strBelongs = this.createBelongsAssociations()

    return strBelongsToMany + strBelongs
  }

  private createBelongsToManyAssociations() {
    const sp = this.space[1]
    let str = ''

    this.relations.forEach(rel => {
      if (rel.isM2M) {
        const asprop = reCase(this.options.caseProp, pluralize(rel.childProp))
        str += `${sp}${rel.parentModel}.belongsToMany(${rel.childModel}, { as: '${asprop}', through: ${rel.joinModel}, foreignKey: "${rel.parentId}", otherKey: "${rel.childId}" });\n`
      }
    })

    return str
  }

  private createBelongsAssociations() {
    const sp = this.space[1]
    let str = ''

    this.relations.forEach(rel => {
      if (!rel.isM2M) {
        const asParentProp = reCase(this.options.caseProp, rel.parentProp)
        const bAlias = this.options.noAlias ? '' : `as: "${asParentProp}", `
        str += `${sp}${rel.childModel}.belongsTo(${rel.parentModel}, { ${bAlias}foreignKey: "${rel.parentId}"});\n`

        const hasRel = rel.isOne ? 'hasOne' : 'hasMany'
        const asChildProp = reCase(this.options.caseProp, rel.childProp)
        const hAlias = this.options.noAlias ? '' : `as: "${asChildProp}", `
        str += `${sp}${rel.parentModel}.${hasRel}(${rel.childModel}, { ${hAlias}foreignKey: "${rel.parentId}"});\n`
      }
    })

    return str
  }

  // create the TypeScript init-models file to load all the models into Sequelize
  private CreateInitString(tables: string[], assoc: string) {
    const importStatements = this.createImportStatements(tables)
    const exportStatements = this.createExportStatements(tables)

    return `
      ${importStatements}

      export function initModels(sequelize: Sequelize) {
        ${tables.map(t => `${this.space[1]}const ${MakeTableName(this.options.caseModel, t, this.options.singularize)} = _${MakeTableName(this.options.caseModel, t, this.options.singularize)}.initModel(sequelize);`).join('\n')}

        ${assoc}

        return {
          ${tables.map(t => `${this.space[2]}${MakeTableName(this.options.caseModel, t, this.options.singularize)}: ${MakeTableName(this.options.caseModel, t, this.options.singularize)},`).join('\n')}
        };
      }
    `
  }

  private createImportStatements(tables: string[]) {
    return tables.map(t => {
      const fileName = reCase(this.options.caseFile, t, this.options.singularize)
      const modelName = MakeTableName(this.options.caseModel, t, this.options.singularize)
      return `
        import { ${modelName} as _${modelName} } from "./${fileName}";
        import type { ${modelName}Attributes, ${modelName}CreationAttributes } from "./${fileName}";
      `
    }).join('\n')
  }

  private createExportStatements(tables: string[]) {
    const modelNames = tables.map(t => MakeTableName(this.options.caseModel, t, this.options.singularize))

    return `
      export {
        ${modelNames.map(m => `${this.space[1]}_${m} as ${m},`).join('\n')}
      };

      export type {
        ${modelNames.map(m => `${this.space[1]}${m}Attributes,`).join('\n')}
        ${modelNames.map(m => `${this.space[1]}${m}CreationAttributes,`).join('\n')}
      };
    `
  }
}
