import { bootstrap, Bootstrapped } from '@/bunet/core'
import type { ClassB } from './class_b'

@Bootstrapped()
export class Main {
  constructor(private readonly classB: ClassB) {}

  hello() {
    return this.classB.hello()
  }
}

const main = bootstrap(Main)

console.log(main.hello())
