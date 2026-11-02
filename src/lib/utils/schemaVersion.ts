/**
 * Version of the data layout written into every export. Exports made before
 * this existed have no `schemaVersion` and are treated as version 1; importers
 * must keep accepting them.
 */
export const SCHEMA_VERSION = 2;
