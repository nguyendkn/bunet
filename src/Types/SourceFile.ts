export type SourceFile = {
  path: string
  content: string
  type: 'Controller' | 'Action' | 'Middleware'
  dependencies: string[]
}
