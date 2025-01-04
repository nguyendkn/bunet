export abstract class ControllerBase {
    public Ok(response: {}) {
        return Response.json(response);
    }
}
