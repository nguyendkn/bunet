import 'reflect-metadata'
import { ServiceCollection } from '../Dependency/ServiceCollection'

export function Inject(): PropertyDecorator {
  return function(target: object, propertyKey: string | symbol, tmp?: any) {
    let instance: any | null = null

    // Lấy kiểu dữ liệu của property
    const type = Reflect.getMetadata('design:type', target, propertyKey)
    if (!type) {
      throw new Error(`Cannot resolve type for property "${String(propertyKey)}". Ensure "emitDecoratorMetadata" is enabled in tsconfig.json.`)
    }

    // Sử dụng tên của class (type) làm token
    const token = type.name.toLowerCase()

    Object.defineProperty(target, propertyKey, {
      get: () => {
        if (!instance) {
          instance = ServiceCollection.instance.Resolve(token)
          if (!instance) {
            throw new Error(`Service for token "${token}" not found.`)
          }
        }
        return instance
      },
      enumerable: true,
      configurable: true
    })
  }
}
