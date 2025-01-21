import type { DialectOptions } from './Options'
import { PostgresDialectOptions } from './PostgreSQL'
import { type Dialect } from 'sequelize'

export const Dialects: { [name in Dialect]: DialectOptions } = {
  postgres: PostgresDialectOptions,
  mysql: {} as any,
  sqlite: {} as any,
  mariadb: {} as any,
  mssql: {} as any,
  db2: {} as any,
  snowflake: {} as any,
  oracle: {} as any
}