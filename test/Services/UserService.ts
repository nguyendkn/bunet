import { type IUser, UserModel } from 'test/Database/Aggregates/UserAggregate/User'
import { AppDbContext } from 'test/Database/AppDbContext'
import { Inject } from '@/bunet/core'

export class UserService {
  @Inject(AppDbContext.name)
  private readonly context!: AppDbContext

  async create(user: IUser): Promise<UserModel> {
    return this.context.Users.create(user)
  }
}
