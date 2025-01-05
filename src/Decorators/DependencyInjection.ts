import { ServiceCollection } from '../Dependency/ServiceCollection'

export function Inject<T>(token: string | symbol): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol) {
    let instance: T | null = null;

    Object.defineProperty(target, propertyKey, {
      get: () => {
        if (!instance) {
          instance = ServiceCollection.instance.Resolve(token); // Resolve service khi cần
        }
        return instance;
      },
      enumerable: true,
      configurable: true,
    });
  };
}