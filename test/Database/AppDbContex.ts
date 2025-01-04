import { DbContext, DbSet, Injectable } from '@/bunet/core'
import { type Options, Sequelize } from 'sequelize'
import { UserModel } from './Aggregates/UserAggregate/User'

@Injectable()
export class AppDbContext extends DbContext {
  public Users?: DbSet<UserModel>

  constructor(options: Options) {
    super(options)
    this.Users = {} as DbSet<UserModel>
  }

  protected OnModelCreating(sequelize: Sequelize): void {
    this.Users = new DbSet<UserModel>(UserModel.Definition(sequelize, 'User'))
  }
}
