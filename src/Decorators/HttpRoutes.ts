export function ApiController(): ClassDecorator {
  return function (target: Function): void {
    // Not implemented yet
  }
}

export function Route(route: string): ClassDecorator {
  return function (target: Function): void {
    // Not implemented yet
  }
}

export function HttpGet(route: string): MethodDecorator {
  return function (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor): void {
    // Not implemented yet
  }
}
