import { type Constructor } from '@/bunet/core'

enum ServiceLifetime {
  Singleton,
  Scoped,
  Transient
}

interface ServiceDescriptor<T> {
  implementation: Constructor<T>;
  lifetime: ServiceLifetime;
  instance?: T;
  params?: any[];
}

export class ServiceCollection {
  public static instance: ServiceCollection
  private readonly services = new Map<string | symbol, ServiceDescriptor<any>>()
  private readonly scopedInstances = new Map<string, Map<string | symbol, any>>()

  AddDbContext<T>(token: string | symbol, instance: T): void {
    const constructor = (instance as any).constructor as Constructor<T>
    this.services.set(token.toString().toLowerCase(), {
      implementation: constructor,
      lifetime: ServiceLifetime.Singleton,
      instance
    })
    console.log(`Singleton instance registered: ${String(token)}`)
  }

  AddSingleton(token: string | symbol, implementation: Constructor, ...params: any[]): void {
    this.ValidateImplementation(implementation)
    this.services.set(token, {
      implementation,
      lifetime: ServiceLifetime.Singleton,
      params
    })
    console.log(`Singleton service registered: ${String(token)}`)
  }

  AddScoped(token: string | symbol, implementation: Constructor, ...params: any[]): void {
    this.ValidateImplementation(implementation)
    this.services.set(token, {
      implementation,
      lifetime: ServiceLifetime.Scoped,
      params
    })
    console.log(`Scoped service registered: ${String(token)}`)
  }

  AddTransient(token: string | symbol, implementation: Constructor, ...params: any[]): void {
    this.ValidateImplementation(implementation)
    this.services.set(token, {
      implementation,
      lifetime: ServiceLifetime.Transient,
      params
    })
    console.log(`Transient service registered: ${String(token)}`)
  }

  Resolve<T>(token: string | symbol, scopeId?: string): T {
    const descriptor = this.services.get(token)
    if (!descriptor) {
      throw new Error(`No service registered for token: ${String(token)}`)
    }

    const { implementation, lifetime, params } = descriptor

    switch (lifetime) {
      case ServiceLifetime.Singleton:
        if (!descriptor.instance) {
          descriptor.instance = new implementation(...(params || []))
          console.log(`Singleton instance created for token: ${String(token)}`)
        }
        return descriptor.instance

      case ServiceLifetime.Scoped:
        if (!scopeId) {
          throw new Error('Scope ID is required for scoped services')
        }
        const scopedInstances = this.scopedInstances.get(scopeId) || new Map()
        if (!scopedInstances.has(token)) {
          scopedInstances.set(token, new implementation(...(params || [])))
          this.scopedInstances.set(scopeId, scopedInstances)
          console.log(`Scoped instance created for token: ${String(token)}, scope ID: ${scopeId}`)
        }
        return scopedInstances.get(token)

      case ServiceLifetime.Transient:
        console.log(`Transient instance created for token: ${String(token)}`)
        return new implementation(...(params || []))

      default:
        throw new Error('Unknown service lifetime')
    }
  }

  CreateScope(): string {
    const scopeId = `${Date.now()}-${Math.random()}`
    this.scopedInstances.set(scopeId, new Map())
    console.log(`Scope created with ID: ${scopeId}`)
    return scopeId
  }

  DisposeScope(scopeId: string): void {
    if (this.scopedInstances.delete(scopeId)) {
      console.log(`Scope disposed with ID: ${scopeId}`)
    } else {
      console.warn(`Scope ID not found: ${scopeId}`)
    }
  }

  private ValidateImplementation(implementation: Constructor): void {
    if (typeof implementation !== 'function' || !implementation.prototype) {
      throw new Error('Provided implementation is not a valid constructor')
    }
  }
}
