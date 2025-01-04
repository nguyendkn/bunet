import { password } from 'bun'
import { ApiController, ControllerBase, HttpGet, Injectable, Route, uuidv7 } from '@/bunet/core'
import type { UserService } from 'test/Services/UserService'

@Injectable()
@ApiController()
@Route('[controller]')
export class UserController extends ControllerBase {
  constructor(private readonly userService: UserService) {
    super()
  }

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
