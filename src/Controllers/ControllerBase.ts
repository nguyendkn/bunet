export abstract class ControllerBase {
  public Ok(response: {}) {
    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}
