import BetterSqlite3 from 'better-sqlite3';
import * as path from 'path';

export function openDb(
  dbPath: string,
  databaseName: string
): BetterSqlite3.Database {
  const pathToStore = path.join(dbPath, databaseName);
  return new BetterSqlite3(pathToStore, {
    nativeBinding: path.join('.', 'native', 'better_sqlite3.node'),
  });
}
