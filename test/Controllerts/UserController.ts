import { password } from 'bun'
import { ApiController, ControllerBase, HttpPost, Inject, Route, uuidv7 } from '@/bunet/core'
import { UserService } from 'test/Services/UserService'
import type { IUser } from '../Database/Aggregates/UserAggregate/User'

@ApiController()
@Route('[controller]')
export class UserController extends ControllerBase {
  @Inject(UserService.name)
  private readonly userService!: UserService

  @HttpPost('/create')
  async create(user: IUser) {
    user.password = await password.hash(user.password)
    const response = await this.userService.create(user)
    return this.Ok(response)
  }
}
