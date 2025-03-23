import { join } from 'path';
import { app } from 'electron';
import fs from 'fs';
import path from 'path';

// 简单内存数据库实现
interface Configuration {
    id: number;
    name: string;
    content: string;
    created_at: string;
    updated_at: string;
}

class DatabaseService {
    private data: {
        configurations: Configuration[];
        nextId: number;
    };
    private static instance: DatabaseService;
    private static dbPath: string;

    private constructor() {
        // 如果没有自定义路径，使用默认路径
        if (!DatabaseService.dbPath) {
            DatabaseService.dbPath = join(app.getPath('userData'), 'data.json');
        }
        
        // 确保目录存在
        const dbDir = path.dirname(DatabaseService.dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        
        console.log('使用数据库路径:', DatabaseService.dbPath);
        
        // 初始化内存数据
        this.data = {
            configurations: [],
            nextId: 1
        };
        
        // 尝试从文件加载数据
        this.loadFromFile();
    }

    // 从文件加载数据
    private loadFromFile(): void {
        try {
            if (fs.existsSync(DatabaseService.dbPath)) {
                const fileContent = fs.readFileSync(DatabaseService.dbPath, 'utf8');
                this.data = JSON.parse(fileContent);
            }
        } catch (error) {
            console.error('加载数据文件失败:', error);
            // 初始化为空数据
            this.data = {
                configurations: [],
                nextId: 1
            };
        }
    }

    // 将数据保存到文件
    private saveToFile(): void {
        try {
            fs.writeFileSync(DatabaseService.dbPath, JSON.stringify(this.data, null, 2), 'utf8');
        } catch (error) {
            console.error('保存数据文件失败:', error);
        }
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
            // 重置实例，让下次获取实例时重新创建
            (DatabaseService as any).instance = undefined;
        }
    }
    
    // 获取当前数据库路径
    public static getDatabasePath(): string {
        if (!DatabaseService.dbPath) {
            DatabaseService.dbPath = join(app.getPath('userData'), 'data.json');
        }
        return DatabaseService.dbPath;
    }
    
    // 关闭数据库连接（保存数据到文件）
    private close(): void {
        this.saveToFile();
    }

    public saveConfiguration(name: string, content: string): Promise<number> {
        console.log('保存配置到数据库:', name, '数据长度:', content ? content.length : 0)
        return new Promise((resolve) => {
            const now = new Date().toISOString();
            const id = this.data.nextId++;
            
            this.data.configurations.push({
                id,
                name,
                content,
                created_at: now,
                updated_at: now
            });
            
            this.saveToFile();
            console.log('保存成功, ID:', id);
            resolve(id);
        });
    }

    public getAllConfigurations(): Promise<Configuration[]> {
        return Promise.resolve([...this.data.configurations]);
    }

    public getConfigurationById(id: number): Promise<Configuration | undefined> {
        return Promise.resolve(
            this.data.configurations.find(config => config.id === id)
        );
    }

    public updateConfiguration(id: number, name: string, content: string): Promise<void> {
        return new Promise((resolve) => {
            const index = this.data.configurations.findIndex(config => config.id === id);
            if (index !== -1) {
                this.data.configurations[index] = {
                    ...this.data.configurations[index],
                    name,
                    content,
                    updated_at: new Date().toISOString()
                };
                this.saveToFile();
            }
            resolve();
        });
    }

    public deleteConfiguration(id: number): Promise<void> {
        return new Promise((resolve) => {
            this.data.configurations = this.data.configurations.filter(config => config.id !== id);
            this.saveToFile();
            resolve();
        });
    }
}

export default DatabaseService; 