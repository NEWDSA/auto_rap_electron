import { Database } from 'sqlite3';
import path from 'path';
import fs from 'fs';

export class DatabaseService {
  private static instance: DatabaseService;
  private db: Database | null = null;
  private dbPath: string;

  private constructor() {
    // 在用户数据目录下创建数据库文件
    const userDataPath = process.env.APPDATA || (process.platform === 'darwin' ? 
      path.join(process.env.HOME!, 'Library/Application Support') : 
      path.join(process.env.HOME!, '.local/share'));
    const appDataPath = path.join(userDataPath, 'auto_rap');
    
    // 确保目录存在
    if (!fs.existsSync(appDataPath)) {
      fs.mkdirSync(appDataPath, { recursive: true });
    }

    this.dbPath = path.join(appDataPath, 'auto_rap.db');
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async connect(): Promise<void> {
    if (this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.db = new Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          this.initializeTables()
            .then(() => resolve())
            .catch(reject);
        }
      });
    });
  }

  private async initializeTables(): Promise<void> {
    const tables = [
      // 流程配置表
      `CREATE TABLE IF NOT EXISTS workflows (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        nodes TEXT NOT NULL,
        edges TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // 执行记录表
      `CREATE TABLE IF NOT EXISTS execution_logs (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        status TEXT NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME,
        error_message TEXT,
        execution_data TEXT,
        FOREIGN KEY (workflow_id) REFERENCES workflows(id)
      )`,
      
      // 数据集表
      `CREATE TABLE IF NOT EXISTS datasets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // 配置表
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const sql of tables) {
      await this.run(sql);
    }
  }

  public async run(sql: string, params: any[] = []): Promise<void> {
    if (!this.db) {
      throw new Error('数据库未连接');
    }

    return new Promise((resolve, reject) => {
      this.db!.run(sql, params, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  public async get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    if (!this.db) {
      throw new Error('数据库未连接');
    }

    return new Promise((resolve, reject) => {
      this.db!.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row as T);
        }
      });
    });
  }

  public async all<T>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.db) {
      throw new Error('数据库未连接');
    }

    return new Promise((resolve, reject) => {
      this.db!.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  public async close(): Promise<void> {
    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.db!.close((err) => {
        if (err) {
          reject(err);
        } else {
          this.db = null;
          resolve();
        }
      });
    });
  }

  // 工作流相关方法
  public async saveWorkflow(workflow: {
    id: string;
    name: string;
    description?: string;
    nodes: any[];
    edges: any[];
  }): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO workflows (id, name, description, nodes, edges, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    await this.run(sql, [
      workflow.id,
      workflow.name,
      workflow.description || '',
      JSON.stringify(workflow.nodes),
      JSON.stringify(workflow.edges)
    ]);
  }

  public async getWorkflow(id: string): Promise<any> {
    const workflow = await this.get<any>(
      'SELECT * FROM workflows WHERE id = ?',
      [id]
    );
    if (workflow) {
      workflow.nodes = JSON.parse(workflow.nodes);
      workflow.edges = JSON.parse(workflow.edges);
    }
    return workflow;
  }

  public async getAllWorkflows(): Promise<any[]> {
    const workflows = await this.all<any>('SELECT * FROM workflows');
    return workflows.map(workflow => ({
      ...workflow,
      nodes: JSON.parse(workflow.nodes),
      edges: JSON.parse(workflow.edges)
    }));
  }

  public async deleteWorkflow(id: string): Promise<void> {
    await this.run('DELETE FROM workflows WHERE id = ?', [id]);
  }

  // 执行记录相关方法
  public async saveExecutionLog(log: {
    id: string;
    workflow_id: string;
    status: string;
    start_time: Date;
    end_time?: Date;
    error_message?: string;
    execution_data?: any;
  }): Promise<void> {
    const sql = `
      INSERT INTO execution_logs 
      (id, workflow_id, status, start_time, end_time, error_message, execution_data)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await this.run(sql, [
      log.id,
      log.workflow_id,
      log.status,
      log.start_time.toISOString(),
      log.end_time?.toISOString(),
      log.error_message,
      log.execution_data ? JSON.stringify(log.execution_data) : null
    ]);
  }

  public async getExecutionLogs(workflow_id: string): Promise<any[]> {
    const logs = await this.all<any>(
      'SELECT * FROM execution_logs WHERE workflow_id = ? ORDER BY start_time DESC',
      [workflow_id]
    );
    return logs.map(log => ({
      ...log,
      execution_data: log.execution_data ? JSON.parse(log.execution_data) : null
    }));
  }

  // 数据集相关方法
  public async saveDataset(dataset: {
    id: string;
    name: string;
    description?: string;
    data: any;
  }): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO datasets (id, name, description, data, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    await this.run(sql, [
      dataset.id,
      dataset.name,
      dataset.description || '',
      JSON.stringify(dataset.data)
    ]);
  }

  public async getDataset(id: string): Promise<any> {
    const dataset = await this.get<any>(
      'SELECT * FROM datasets WHERE id = ?',
      [id]
    );
    if (dataset) {
      dataset.data = JSON.parse(dataset.data);
    }
    return dataset;
  }

  public async getAllDatasets(): Promise<any[]> {
    const datasets = await this.all<any>('SELECT * FROM datasets');
    return datasets.map(dataset => ({
      ...dataset,
      data: JSON.parse(dataset.data)
    }));
  }

  public async deleteDataset(id: string): Promise<void> {
    await this.run('DELETE FROM datasets WHERE id = ?', [id]);
  }

  // 配置相关方法
  public async setSetting(key: string, value: any, description?: string): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO settings (key, value, description, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `;
    await this.run(sql, [key, JSON.stringify(value), description]);
  }

  public async getSetting(key: string): Promise<any> {
    const setting = await this.get<any>(
      'SELECT * FROM settings WHERE key = ?',
      [key]
    );
    return setting ? JSON.parse(setting.value) : null;
  }

  public async getAllSettings(): Promise<any[]> {
    const settings = await this.all<any>('SELECT * FROM settings');
    return settings.map(setting => ({
      ...setting,
      value: JSON.parse(setting.value)
    }));
  }

  public async deleteSetting(key: string): Promise<void> {
    await this.run('DELETE FROM settings WHERE key = ?', [key]);
  }
} 