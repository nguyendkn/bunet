import { DbContext, DbSet } from '@/bunet/core'
import { type Options, Sequelize } from 'sequelize'
import { UserModel } from './Aggregates/UserAggregate/User'

export class AppDbContext extends DbContext {
  public Users!: DbSet<UserModel>

  constructor(options: Options) {
    super(options)
  }

  protected OnModelCreating(sequelize: Sequelize): void {
    this.Users = new DbSet<UserModel>(UserModel.Definition(sequelize, 'User'))
  }
}
