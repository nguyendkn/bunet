import { SecurityHeaders } from '../Shared/Constants'

export abstract class ControllerBase {
  public Ok(response: {}) {
    return new Response(JSON.stringify(response), {
      headers: {
        ...SecurityHeaders,
        'Content-Type': 'application/json'
      }
    })
  }
}
