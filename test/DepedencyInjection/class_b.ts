import { Injectable } from '@/bunet/core'
import type { ClassA } from './class_a'

@Injectable()
export class ClassB {
  constructor(private readonly classA: ClassA) {}

  hello() {
    return `Hello from ClassB and ${this.classA.hello()}!`
  }
}
