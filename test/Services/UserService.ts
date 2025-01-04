import { Injectable } from '@/bunet/core'
import type { IUser } from 'test/Database/Aggregates/UserAggregate/User'
import type { AppDbContext } from 'test/Database/AppDbContex'

@Injectable()
export class UserService {
  constructor(public context: AppDbContext) {}

  async create(user: IUser) {
    return await this.context.Users?.create(user)
  }
}
