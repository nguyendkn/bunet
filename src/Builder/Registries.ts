import type { SourceFile } from "ts-morph";

export type MethodType = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type Action = {
  Name: string;
  Route: string;
  Controller: string;
  Method: MethodType;
  Handler: (request: Request) => Promise<Response>;
};

export type Controller = {
  Name: string;
  Path: string;
  Route: string;
  Content: string;
  SourceFile: SourceFile;
  Actions?: Action[];
};

export type RegistryType = {
  Controllers: Set<Controller>;
};

export const Registry: RegistryType = {
  Controllers: new Set<Controller>(),
};
