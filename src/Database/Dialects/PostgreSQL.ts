import _ from 'lodash'
import { addTicks, type DialectOptions, type FKRow, makeCondition } from './Options'

export const PostgresDialectOptions: DialectOptions = {
  name: 'postgres',
  hasSchema: true,

  /**
   * Generates an SQL query to retrieve all foreign keys of a table.
   *
   * @param  {String} tableName  The name of the table.
   * @param  {String} schemaName The name of the schema.
   * @return {String}            The generated SQL query.
   */
  getForeignKeysQuery: (tableName: string, schemaName: string): string => {
    return `SELECT DISTINCT tc.constraint_name     AS constraint_name,
                            tc.constraint_type     AS constraint_type,
                            tc.constraint_schema   AS source_schema,
                            tc.table_name          AS source_table,
                            kcu.column_name        AS source_column,
                            CASE
                                WHEN tc.constraint_type = 'FOREIGN KEY' THEN ccu.constraint_schema
                                ELSE NULL END      AS target_schema,
                            CASE
                                WHEN tc.constraint_type = 'FOREIGN KEY' THEN ccu.table_name
                                ELSE NULL END      AS target_table,
                            CASE
                                WHEN tc.constraint_type = 'FOREIGN KEY' THEN ccu.column_name
                                ELSE NULL END      AS target_column,
                            co.column_default      AS extra,
                            co.identity_generation AS generation
            FROM information_schema.table_constraints AS tc
                     JOIN information_schema.key_column_usage AS kcu
                          ON tc.table_schema = kcu.table_schema AND tc.table_name = kcu.table_name AND
                             tc.constraint_name = kcu.constraint_name
                     JOIN information_schema.constraint_column_usage AS ccu
                          ON ccu.constraint_schema = tc.constraint_schema AND ccu.constraint_name = tc.constraint_name
                     JOIN information_schema.columns AS co
                          ON co.table_schema = kcu.table_schema AND co.table_name = kcu.table_name AND
                             co.column_name = kcu.column_name
            WHERE tc.table_name = ${addTicks(tableName)} ${makeCondition('tc.constraint_schema', schemaName)}`
  },

  /**
   * Generates an SQL query to count triggers associated with a table.
   *
   * @param  {String} tableName  The name of the table.
   * @param  {String} schemaName The name of the schema.
   * @return {String}            The generated SQL query.
   */
  countTriggerQuery: (tableName: string, schemaName: string): string => {
    return `SELECT COUNT(0) AS trigger_count
            FROM information_schema.triggers AS t
            WHERE t.event_object_table = ${addTicks(tableName)} ${makeCondition('t.event_object_schema', schemaName)}`
  },

  /**
   * Determines if the record from the getForeignKeysQuery result is a foreign key.
   *
   * @param {Object} record The row entry from getForeignKeysQuery.
   * @return {boolean}
   */
  isForeignKey: (record: FKRow): boolean => {
    return _.isObject(record) && _.has(record, 'constraint_type') && record.constraint_type === 'FOREIGN KEY'
  },

  /**
   * Determines if the record from the getForeignKeysQuery result is a unique key.
   *
   * @param {Object} record The row entry from getForeignKeysQuery.
   * @return {boolean}
   */
  isUnique: (record: FKRow): boolean => {
    return _.isObject(record) && _.has(record, 'constraint_type') && record.constraint_type === 'UNIQUE'
  },

  /**
   * Determines if the record from the getForeignKeysQuery result is a primary key.
   *
   * @param {Object} record The row entry from getForeignKeysQuery.
   * @return {boolean}
   */
  isPrimaryKey: (record: FKRow): boolean => {
    return _.isObject(record) && _.has(record, 'constraint_type') && record.constraint_type === 'PRIMARY KEY'
  },

  /**
   * Determines if the record from the getForeignKeysQuery result is a serial/auto-increment key.
   *
   * @param {Object} record The row entry from getForeignKeysQuery.
   * @return {boolean}
   */
  isSerialKey: (record: { extra: string; defaultValue: string; generation: string }) => {
    const isSequence = (value: string) =>
      !!value &&
      ((_.startsWith(value, 'nextval') && _.includes(value, '_seq') && _.includes(value, '::regclass')) ||
        value === 'ALWAYS' ||
        value === 'BY DEFAULT')
    return (
      _.isObject(record) &&
      (isSequence(record.extra) || isSequence(record.defaultValue) || isSequence(record.generation))
    )
  },

  /**
   * Override Sequelize's method for showing all tables to allow schema support.
   *
   * @param {String} schemaName Optional. The schema from which to list tables.
   * @return {String}
   */
  showTablesQuery: (schemaName?: string) => {
    return `SELECT table_name, table_schema
            FROM information_schema.tables
            WHERE table_type = 'BASE TABLE'
              AND table_schema NOT IN ('pg_catalog', 'information_schema')
              AND table_name != 'spatial_ref_sys' ${makeCondition('table_schema', schemaName)}`
  },

  /**
   * Generates an SQL query to retrieve all views in the schema.
   *
   * @param {String} schemaName Optional. The schema from which to list views.
   * @return {String}
   */
  showViewsQuery: (schemaName?: string): string => {
    return `SELECT table_name, table_schema
            FROM information_schema.tables
            WHERE table_type = 'VIEW'
              AND table_schema NOT IN ('pg_catalog', 'information_schema')
                ${makeCondition('table_schema', schemaName)}`
  },

  /**
   * Get the element type for ARRAY and USER-DEFINED data types.
   *
   * @param {String} tableName The name of the table.
   * @param {String} schemaName Optional. The schema name.
   * @return {String} The SQL query.
   */
  showElementTypeQuery: (tableName: string, schemaName?: string): string => {
    return (
      `SELECT c.column_name,
                   c.data_type,
                   c.udt_name,
                   e.data_type                                  AS element_type,
                   (SELECT array_agg(pe.enumlabel)
                    FROM pg_catalog.pg_type pt
                             JOIN pg_catalog.pg_enum pe ON pt.oid = pe.enumtypid
                    WHERE pt.typname = c.udt_name
                       OR CONCAT('_', pt.typname) = c.udt_name) AS enum_values
            FROM information_schema.columns c
                     LEFT JOIN information_schema.element_types e
                               ON ((c.table_catalog, c.table_schema, c.table_name, 'TABLE', c.dtd_identifier)
                                   = (e.object_catalog, e.object_schema, e.object_name, e.object_type,
                                      e.collection_type_identifier))
            WHERE c.table_name = '${tableName}'` + (schemaName ? ` AND c.table_schema = '${schemaName}'` : '')
    )
  },

  /**
   * Retrieves the geography type data from the geography_columns table.
   *
   * @param {String} tableName The name of the table.
   * @param {String} schemaName Optional. The schema name.
   * @return {String} The SQL query.
   */
  showGeographyTypeQuery: (tableName: string, schemaName?: string): string => {
    return (
      `SELECT f_geography_column AS column_name,
                   type               AS udt_name,
                   srid               AS data_type,
                   coord_dimension    AS element_type
            FROM geography_columns
            WHERE f_table_name = '${tableName}'` + (schemaName ? ` AND f_table_schema = '${schemaName}'` : '')
    )
  },

  /**
   * Retrieves the geometry type data from the geometry_columns table.
   *
   * @param {String} tableName The name of the table.
   * @param {String} schemaName Optional. The schema name.
   * @return {String} The SQL query.
   */
  showGeometryTypeQuery: (tableName: string, schemaName?: string): string => {
    return (
      `SELECT f_geometry_column AS column_name,
                   type              AS udt_name,
                   srid              AS data_type,
                   coord_dimension   AS element_type
            FROM geometry_columns
            WHERE f_table_name = '${tableName}'` + (schemaName ? ` AND f_table_schema = '${schemaName}'` : '')
    )
  }
}
