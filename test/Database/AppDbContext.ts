import { DbContext, DbSet } from '@/bunet/core'
import { type Options, Sequelize } from 'sequelize'
import { UserModel } from './Aggregates/UserAggregate/User'

export class AppDbContext extends DbContext {
  public Users: DbSet<UserModel> = new DbSet<UserModel>(UserModel.Definition(this.sequelize, 'User', 'Users'))

  constructor(options: Options) {
    super(options)
  }

  protected OnModelCreating(sequelize: Sequelize): void {
    this.sequelize.sync({ alter: true }).catch(console.error)
  }
}
