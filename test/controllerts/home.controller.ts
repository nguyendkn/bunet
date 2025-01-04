import { ApiController, ControllerBase, HttpGet, Route } from '@bunet/core'

@ApiController()
@Route('[controller]')
export class HelloController extends ControllerBase {
  @HttpGet('/world')
  world() {
    return this.Ok({
      message: 'hello world'
    })
  }
}
