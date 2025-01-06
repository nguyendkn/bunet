import { password } from 'bun'
import { ApiController, ControllerBase, HttpPost, Inject, Route, uuidv7 } from '@/bunet/core'
import { UserService } from '../Services/UserService'
import type { IUser } from '../Database/Aggregates/UserAggregate/User'

@ApiController()
@Route('[controller]')
export class UserController extends ControllerBase {
  @Inject() private userService!: UserService

  @HttpPost('/create')
  async create(user: IUser) {
    user.id = uuidv7()
    user.password = await password.hash(user.password)
    const response = await this.userService.create(user)
    return this.Ok(response)
  }
}
