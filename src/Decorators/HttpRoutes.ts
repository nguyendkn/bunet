export function ApiController(): ClassDecorator {
  return function (target: Function): void {}
}

export function Route(route: string): ClassDecorator {
  return function (target: Function): void {}
}

export function HttpGet(route: string): MethodDecorator {
  return function (target: Object, propertyKey: string | symbol, descriptor?: PropertyDescriptor): void {}
}

export function HttpPost(route: string): MethodDecorator {
  return function (target: Object, propertyKey: string | symbol, descriptor?: PropertyDescriptor): void {}
}

export function HttpPut(route: string): MethodDecorator {
  return function (target: Object, propertyKey: string | symbol, descriptor?: PropertyDescriptor): void {}
}

export function HttpDelete(route: string): MethodDecorator {
  return function (target: Object, propertyKey: string | symbol, descriptor?: PropertyDescriptor): void {}
}
