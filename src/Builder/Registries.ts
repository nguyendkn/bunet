import type { SourceFile } from 'ts-morph'

export type MethodType = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export type ControllerActionType = {
  Name: string
  Route: string
  Controller: string
  Method: MethodType
  Handler: (request: Request) => Promise<Response>
}

export type ControllerType = {
  Name: string
  Path: string
  Route: string
  Content: string
  SourceFile: SourceFile
  Actions?: ControllerActionType[]
}

export type DbContextType = {
  Name: string
  Path: string
  Content: string
  SourceFile: SourceFile
}

export type RegistryType = {
  Controllers: Set<ControllerType>
  DbContexts: Set<DbContextType>
}

export const Registry: RegistryType = {
  Controllers: new Set<ControllerType>(),
  DbContexts: new Set<DbContextType>(),
}
