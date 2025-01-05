import { password } from 'bun'
import { ApiController, ControllerBase, HttpGet, Inject, Route, uuidv7 } from '@/bunet/core'
import { UserService } from 'test/Services/UserService'

@ApiController()
@Route('[controller]')
export class UserController extends ControllerBase {
  @Inject(UserService.name)
  private readonly userService!: UserService

  @HttpGet('/create')
  async create() {
    const user = {
      id: uuidv7(),
      name: 'Dao Khoi Nguyen',
      userName: 'nguyendk',
      password: await password.hash('Pass@word')
    }
    const response = this.userService.create(user)
    return this.Ok(response)
  }
}
