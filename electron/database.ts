import sqlite3 from 'sqlite3';
import { join } from 'path';
import { app } from 'electron';
import fs from 'fs';
import path from 'path';

interface SqliteCallback {
    (err: Error | null): void;
}

interface SqliteRunResult {
    lastID: number;
    changes: number;
}

class DatabaseService {
    private db: sqlite3.Database;
    private static instance: DatabaseService;
    private static dbPath: string;

    private constructor() {
        // 如果没有自定义路径，使用默认路径
        if (!DatabaseService.dbPath) {
            DatabaseService.dbPath = join(app.getPath('userData'), 'data.db');
        }
        
        // 确保目录存在
        const dbDir = path.dirname(DatabaseService.dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        
        console.log('使用数据库路径:', DatabaseService.dbPath);
        this.db = new sqlite3.Database(DatabaseService.dbPath);
        this.initTables();
    }

    public static getInstance(): DatabaseService {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }

    // 设置数据库路径
    public static setDatabasePath(newPath: string): void {
        // 保存新路径
        DatabaseService.dbPath = newPath;
        
        // 如果实例已存在，需要重新初始化
        if (DatabaseService.instance) {
            // 关闭现有连接
            DatabaseService.instance.close();
            // 重置实例，让下次获取实例时重新创建
            (DatabaseService as any).instance = undefined;
        }
    }
    
    // 获取当前数据库路径
    public static getDatabasePath(): string {
        if (!DatabaseService.dbPath) {
            DatabaseService.dbPath = join(app.getPath('userData'), 'data.db');
        }
        return DatabaseService.dbPath;
    }
    
    // 关闭数据库连接
    private close(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    private initTables(): void {
        this.db.run(`
            CREATE TABLE IF NOT EXISTS configurations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }

    public saveConfiguration(name: string, content: string): Promise<number> {
        console.log('保存配置到数据库:', name, '数据长度:', content ? content.length : 0)
        return new Promise((resolve, reject) => {
            try {
                const stmt = this.db.prepare(
                    `INSERT INTO configurations (name, content) VALUES (?, ?)`
                );
                console.log('SQL语句准备完成')
                stmt.run(name, content, function(this: SqliteRunResult, err: Error | null) {
                    if (err) {
                        console.error('SQL执行错误:', err)
                        reject(err);
                    } else {
                        console.log('SQL执行成功, ID:', this.lastID)
                        resolve(this.lastID);
                    }
                });
            } catch (error) {
                console.error('准备SQL语句错误:', error)
                reject(error);
            }
        });
    }

    public getAllConfigurations(): Promise<any[]> {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM configurations', (err: Error | null, rows: any[]) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    public getConfigurationById(id: number): Promise<any> {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM configurations WHERE id = ?', [id], (err: Error | null, row: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    public updateConfiguration(id: number, name: string, content: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(
                `UPDATE configurations 
                 SET name = ?, content = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`
            );
            stmt.run(name, content, id, (err: Error | null) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    public deleteConfiguration(id: number): Promise<void> {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare('DELETE FROM configurations WHERE id = ?');
            stmt.run(id, (err: Error | null) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
}

export default DatabaseService; 