declare global {
  interface String {
    ToUpperCase(): string
    ToCapitalize(): string
    ParseTo<T>(): T
  }
  interface Object {
    ToJson(): string
  }
}

import '@/bunet/core'

export {}
