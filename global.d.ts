declare global {
  interface String {
    ToUpperCase(): string
    ToCapitalize(): string
    ParseTo<T>(): T
    Format(...args: any[]): string
  }
  interface Object {
    ToJson(): string
  }
}

import '@/bunet/core'

export {}
