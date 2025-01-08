import { Utils } from 'sequelize'

export interface DialectOptions {
  name: string;
  hasSchema: boolean;

  /**
   * Generates an SQL query to retrieve foreign keys for a specific table.
   */
  getForeignKeysQuery: (tableName: string, schemaName: string) => string;

  /**
   * Optional remapping function for foreign keys row.
   */
  remapForeignKeysRow?: (tableName: string, row: FKRow) => FKRelation;

  /**
   * Generates an SQL query to count triggers associated with a table.
   */
  countTriggerQuery: (tableName: string, schemaName: string) => string;

  /**
   * Checks if a record is a foreign key.
   */
  isForeignKey?: (record: any) => boolean;

  /**
   * Checks if a record is a unique key.
   */
  isUnique?: (record: FKRow, records: FKRow[]) => boolean;

  /**
   * Checks if a record is a primary key.
   */
  isPrimaryKey: (record: any) => boolean;

  /**
   * Checks if a record is a serial/auto-increment key.
   */
  isSerialKey: (record: any) => boolean;

  /**
   * Generates an SQL query to retrieve all tables in a schema.
   */
  showTablesQuery?: (schemaName?: string) => string;

  /**
   * Generates an SQL query to retrieve all views in a schema.
   */
  showViewsQuery: (schemaName?: string) => string;

  /**
   * Generates an SQL query to retrieve the element type for ARRAY or USER-DEFINED data types.
   */
  showElementTypeQuery?: (tableName: string, schemaName?: string) => string;

  /**
   * Generates an SQL query to retrieve geography column types.
   */
  showGeographyTypeQuery?: (tableName: string, schemaName?: string) => string;

  /**
   * Generates an SQL query to retrieve geometry column types.
   */
  showGeometryTypeQuery?: (tableName: string, schemaName?: string) => string;

  /**
   * Generates an SQL query to retrieve the numeric precision of a column.
   */
  showPrecisionQuery?: (tableName: string, schemaName?: string) => string;
}

export interface FKRow {
  table: string;
  id: string;
  from: string;
  to: string;
  type: string;
  primaryKey: boolean;
  extra: string;
  column_key: string;
  constraint_name: string;
  constraint_type: string;
  contype: string;
  is_identity: boolean;
}

export interface FKRelation {
  constraint_name: string;
  source_schema?: string;
  source_table: string;
  source_column: string;
  target_schema?: string;
  target_table: string;
  target_column: string;
}

export interface FKSpec extends FKRelation {
  isForeignKey: boolean;
  isSerialKey: boolean;
  isPrimaryKey: boolean;
  isUnique: boolean | string;
  foreignSources: {
    source_table?: string;
    source_schema?: string;
    source_column?: string;
    target_table?: string;
    target_schema?: string;
    target_column?: string;
  };
  extra?: string;
  column_key?: string;
}

export interface ColumnElementType {
  column_name: string;
  data_type: string;
  udt_name: string;
  element_type: string;
  enum_values: string;
}

export interface ColumnPrecision {
  column_name: string;
  numeric_precision: number;
  numeric_scale: number;
}

export interface TriggerCount {
  trigger_count: number;
}

/**
 * Adds ticks around a value for SQL query formatting.
 */
export function addTicks(value: any): string {
  return Utils.addTicks(value, '\'')
}

/**
 * Generates an SQL condition for a column value.
 */
export function makeCondition(columnName: string, value?: string): string {
  return value ? ` AND ${columnName} = ${addTicks(value)} ` : ''
}
