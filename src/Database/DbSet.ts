import { Model, type ModelStatic, type Optional } from 'sequelize'

type ModelType<T extends Model> = typeof Model & {
  new (values?: Optional<T['_attributes'], keyof T['_creationAttributes']>, options?: any): T
}

export class DbSet<T extends Model> {
  private model: ModelStatic<T>

  constructor(model: ModelStatic<T>) {
    this.model = model
  }

  public async findAll(options?: any): Promise<T[]> {
    return this.model.findAll(options)
  }

  public async findByPk(primaryKey: any): Promise<T | null> {
    return this.model.findByPk(primaryKey)
  }

  public async create(data: any): Promise<T> {
    return this.model.create(data)
  }

  public async update(data: any, options: any): Promise<[number, T[]]> {
    return this.model.update(data, options)
  }

  public async delete(options: any): Promise<number> {
    return this.model.destroy(options)
  }
}
