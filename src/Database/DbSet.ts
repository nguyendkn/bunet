import { type GroupedCountResultItem, Model, type ModelStatic, type Optional, Transaction } from 'sequelize'
import { Logger } from '../Logging'

type ModelType<T extends Model> = typeof Model & {
  new(values?: Optional<T['_attributes'], keyof T['_creationAttributes']>, options?: any): T;
};

export class DbSet<T extends Model> {
  private model: ModelStatic<T>

  constructor(model: ModelStatic<T>) {
    if (!model || typeof model.init !== 'function') {
      throw new Error('Invalid model provided to DbSet.')
    }
    this.model = model
  }

  public async Upsert(data: Partial<T['_creationAttributes']>, transaction?: Transaction): Promise<{
    type: 'created' | 'updated' | 'exception'
    record: T | null | undefined
  }> {
    try {
      const values = data as T['_creationAttributes']

      const [record, created] = await this.model.upsert(values, {
        returning: true,
        transaction
      })

      return {
        type: created ? 'created' : 'updated',
        record
      }
    } catch (error: any) {
      Logger.Error('Error in Upsert: {0}', error.message)
      return {
        type: 'exception',
        record: null
      }
    }
  }

  public async FindAll(options?: any): Promise<T[]> {
    return this.model.findAll(options)
  }

  public async FindByPk(primaryKey: any): Promise<T | null> {
    return this.model.findByPk(primaryKey)
  }

  public async FindOne(options?: any): Promise<T | null> {
    return this.model.findOne(options)
  }

  public async Count(options?: any): Promise<GroupedCountResultItem[]> {
    return this.model.count(options)
  }

  public async Create(data: Partial<T['_creationAttributes']>): Promise<T> {
    return this.model.create(data as T['_creationAttributes'])
  }

  public async Update(data: Partial<T['_attributes']>, options: any): Promise<[number, T[]]> {
    return this.model.update(data as Partial<T['_attributes']>, options)
  }

  public async Delete(options: any): Promise<number> {
    return this.model.destroy(options)
  }

  public async Transaction<R>(callback: (transaction: any) => Promise<R>): Promise<R | undefined> {
    if (!this.model.sequelize) {
      throw new Error('Sequelize instance is not initialized for this model.')
    }
    return this.model.sequelize?.transaction(callback)
  }
}
