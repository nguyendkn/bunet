import type { Constructor } from '../Dependency/Constructor'
import { setInjectionMetadata } from '../Dependency/Injector'

export interface InjectionOptions {
  isSingleton?: boolean
}

export function Injectable<T>(options: InjectionOptions = {}) {
  return (Type: Constructor<T>): void => {
    setInjectionMetadata(Type, {
      isSingleton: options.isSingleton !== false
    })
  }
}

export function Bootstrapped<T>() {
  return (_: Constructor<T>): void => {}
}
