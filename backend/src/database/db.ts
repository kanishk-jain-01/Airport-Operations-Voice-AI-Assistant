import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';

class DatabaseManager {
  private db: sqlite3.Database | null = null;
  private dbPath: string;

  constructor() {
    this.dbPath = path.join(
      process.cwd(),
      'united_airlines_normalized (Gauntlet).db'
    );
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(this.dbPath)) {
        console.warn(
          `Database file not found at ${this.dbPath}. Please ensure the database file exists.`
        );
      }

      this.db = new sqlite3.Database(':memory:', err => {
        if (err) {
          reject(err);
          return;
        }

        if (fs.existsSync(this.dbPath)) {
          const fileDb = new sqlite3.Database(
            this.dbPath,
            sqlite3.OPEN_READONLY
          );

          fileDb.serialize(() => {
            fileDb.all(
              "SELECT sql FROM sqlite_master WHERE type='table'",
              (err, tables: Record<string, any>[]) => {
                if (err) {
                  reject(err);
                  return;
                }

                const loadPromises = tables.map(table => {
                  return new Promise<void>((res, rej) => {
                    if (table.sql) {
                      this.db!.run(table.sql, err => {
                        if (err) {
                          rej(err);
                          return;
                        }

                        const tableName =
                          table.sql.match(/CREATE TABLE (\w+)/)?.[1];
                        if (tableName) {
                          fileDb.all(
                            `SELECT * FROM ${tableName}`,
                            (err, rows: Record<string, any>[]) => {
                              if (err) {
                                rej(err);
                                return;
                              }

                              if (rows && rows.length > 0 && rows[0]) {
                                const columns = Object.keys(rows[0]);
                                const placeholders = columns
                                  .map(() => '?')
                                  .join(',');
                                const stmt = this.db!.prepare(
                                  `INSERT INTO ${tableName} VALUES (${placeholders})`
                                );

                                rows.forEach(row => {
                                  stmt.run(Object.values(row));
                                });

                                stmt.finalize(err => {
                                  if (err) rej(err);
                                  else res();
                                });
                              } else {
                                res();
                              }
                            }
                          );
                        } else {
                          res();
                        }
                      });
                    } else {
                      res();
                    }
                  });
                });

                Promise.all(loadPromises)
                  .then(() => {
                    fileDb.close();
                    console.log('Database loaded into memory successfully');
                    resolve();
                  })
                  .catch(reject);
              }
            );
          });
        } else {
          console.log('Running with empty in-memory database');
          resolve();
        }
      });
    });
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getTableSchema(): Promise<any[]> {
    return this.query("SELECT name FROM sqlite_master WHERE type='table'");
  }

  async getFlightByNumber(flightNumber: string): Promise<any[]> {
    const sql = `
      SELECT 
        f.flight_number,
        f.flight_status,
        f.scheduled_departure,
        f.actual_departure,
        f.scheduled_arrival,
        f.actual_arrival,
        f.aircraft_type,
        f.passenger_count,
        f.captain_name,
        f.cabin_lead_name,
        origin.airport_name as origin_name,
        origin.city_name as origin_city,
        dest.airport_name as destination_name,
        dest.city_name as destination_city,
        g.gate_number,
        g.terminal
      FROM flights f
      LEFT JOIN airports origin ON f.origin_airport_code = origin.airport_code
      LEFT JOIN airports dest ON f.destination_airport_code = dest.airport_code
      LEFT JOIN gates g ON f.gate_id = g.gate_id
      WHERE f.flight_number LIKE ?
    `;
    return this.query(sql, [`%${flightNumber}%`]);
  }

  async searchFlightsByRoute(origin?: string, destination?: string): Promise<any[]> {
    let sql = `
      SELECT 
        f.flight_number,
        f.flight_status,
        f.scheduled_departure,
        f.scheduled_arrival,
        f.aircraft_type,
        origin.airport_name as origin_name,
        origin.city_name as origin_city,
        dest.airport_name as destination_name,
        dest.city_name as destination_city,
        g.gate_number,
        g.terminal
      FROM flights f
      LEFT JOIN airports origin ON f.origin_airport_code = origin.airport_code
      LEFT JOIN airports dest ON f.destination_airport_code = dest.airport_code
      LEFT JOIN gates g ON f.gate_id = g.gate_id
      WHERE 1=1
    `;
    
    const params: string[] = [];
    
    if (origin) {
      sql += ` AND (origin.city_name LIKE ? OR origin.airport_code LIKE ? OR origin.airport_name LIKE ?)`;
      params.push(`%${origin}%`, `%${origin}%`, `%${origin}%`);
    }
    
    if (destination) {
      sql += ` AND (dest.city_name LIKE ? OR dest.airport_code LIKE ? OR dest.airport_name LIKE ?)`;
      params.push(`%${destination}%`, `%${destination}%`, `%${destination}%`);
    }
    
    sql += ` ORDER BY f.scheduled_departure`;
    
    return this.query(sql, params);
  }

  close(): void {
    if (this.db) {
      this.db.close();
    }
  }
}

export const db = new DatabaseManager();
