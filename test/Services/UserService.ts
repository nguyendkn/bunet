import { type IUser, UserModel } from '../Database/Aggregates/UserAggregate/User'
import { AppDbContext } from '../Database/AppDbContext'
import { Inject } from '@/bunet/core'

export class UserService {
  @Inject(AppDbContext.name)
  private readonly context!: AppDbContext

  async create(user: IUser): Promise<UserModel> {
    return this.context.Users.Create(user)
  }
}
