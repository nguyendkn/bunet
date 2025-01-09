import { DbContext, DbSet } from '@/bunet/core'
import { type Options, Sequelize } from 'sequelize'
import { UserModel } from './Aggregates/UserAggregate/User'
import * as Path from 'node:path'

export class AppDbContext extends DbContext {
  public Users: DbSet<UserModel> = new DbSet<UserModel>(UserModel.Definition(this.sequelize, 'User', 'Users'))

  constructor(options: Options) {
    super(options)
  }

  protected OnModelCreating(sequelize: Sequelize): void {
    this.Sync(sequelize, {
      ...this.options,
      migrationMode: 'Database',
      directory: Path.resolve(__dirname, 'Models'),
      singularize: false,
      useDefine: true
    }).catch(console.error)
  }
}
