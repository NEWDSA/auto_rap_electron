import Redis, { RedisOptions } from 'ioredis';
import { redisConfig, redisCacheConfig } from '../config/redis';

export class RedisService {
  private static instance: RedisService;
  private redis: Redis | null = null;
  private readonly defaultTTL = redisCacheConfig.defaultTTL;

  private constructor() {
    try {
      const config: RedisOptions = {
        ...redisConfig,
        retryStrategy: (times: number) => {
          if (times > redisConfig.maxRetriesPerRequest!) {
            return null; // 停止重试
          }
          return redisConfig.retryStrategy!(times);
        }
      };

      this.redis = new Redis(config);
      
      // 监听连接事件
      this.redis.on('connect', () => {
        console.log('Redis连接成功');
      });

      this.redis.on('error', (err) => {
        console.error('Redis连接错误:', err);
      });

      this.redis.on('close', () => {
        console.log('Redis连接关闭');
      });
    } catch (error) {
      console.error('Redis初始化失败:', error);
    }
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  // 基础缓存操作
  public async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.redis) {
      throw new Error('Redis未连接');
    }

    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      if (ttl) {
        await this.redis.set(key, stringValue, 'EX', ttl);
      } else {
        await this.redis.set(key, stringValue);
      }
    } catch (error) {
      console.error('Redis设置缓存失败:', error);
      throw error;
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    if (!this.redis) {
      throw new Error('Redis未连接');
    }

    try {
      const value = await this.redis.get(key);
      if (!value) return null;
      
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    } catch (error) {
      console.error('Redis获取缓存失败:', error);
      throw error;
    }
  }

  public async del(key: string): Promise<void> {
    if (!this.redis) {
      throw new Error('Redis未连接');
    }

    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Redis删除缓存失败:', error);
      throw error;
    }
  }

  public async exists(key: string): Promise<boolean> {
    if (!this.redis) {
      throw new Error('Redis未连接');
    }

    try {
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('Redis检查键是否存在失败:', error);
      throw error;
    }
  }

  // 工作流缓存操作
  public async cacheWorkflowStatus(workflowId: string, status: string): Promise<void> {
    const key = `${redisConfig.keyPrefix}workflow:${workflowId}:status`;
    await this.set(key, status, this.defaultTTL);
  }

  public async getWorkflowStatus(workflowId: string): Promise<string | null> {
    const key = `${redisConfig.keyPrefix}workflow:${workflowId}:status`;
    return await this.get<string>(key);
  }

  public async cacheWorkflowProgress(workflowId: string, progress: number): Promise<void> {
    const key = `${redisConfig.keyPrefix}workflow:${workflowId}:progress`;
    await this.set(key, progress, this.defaultTTL);
  }

  public async getWorkflowProgress(workflowId: string): Promise<number | null> {
    const key = `${redisConfig.keyPrefix}workflow:${workflowId}:progress`;
    return await this.get<number>(key);
  }

  public async cacheWorkflowData(workflowId: string, data: any): Promise<void> {
    const key = `${redisConfig.keyPrefix}workflow:${workflowId}:data`;
    await this.set(key, data, this.defaultTTL);
  }

  public async getWorkflowData<T>(workflowId: string): Promise<T | null> {
    const key = `${redisConfig.keyPrefix}workflow:${workflowId}:data`;
    return await this.get<T>(key);
  }

  // 任务队列操作
  public async addTask(task: any): Promise<void> {
    const key = `${redisConfig.keyPrefix}workflow:queue`;
    await this.redis?.lpush(key, JSON.stringify(task));
  }

  public async getNextTask<T>(): Promise<T | null> {
    const key = `${redisConfig.keyPrefix}workflow:queue`;
    const task = await this.redis?.rpop(key);
    if (!task) return null;
    return JSON.parse(task) as T;
  }

  public async getQueueLength(): Promise<number> {
    const key = `${redisConfig.keyPrefix}workflow:queue`;
    return await this.redis?.llen(key) || 0;
  }

  // 计数器操作
  public async increment(key: string): Promise<number> {
    if (!this.redis) {
      throw new Error('Redis未连接');
    }
    const fullKey = `${redisConfig.keyPrefix}${key}`;
    return await this.redis.incr(fullKey);
  }

  public async decrement(key: string): Promise<number> {
    if (!this.redis) {
      throw new Error('Redis未连接');
    }
    const fullKey = `${redisConfig.keyPrefix}${key}`;
    return await this.redis.decr(fullKey);
  }

  // 批量操作
  public async mset(keyValues: Record<string, any>, ttl?: number): Promise<void> {
    if (!this.redis) {
      throw new Error('Redis未连接');
    }

    const pipeline = this.redis.pipeline();
    
    for (const [key, value] of Object.entries(keyValues)) {
      const fullKey = `${redisConfig.keyPrefix}${key}`;
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      if (ttl) {
        pipeline.set(fullKey, stringValue, 'EX', ttl);
      } else {
        pipeline.set(fullKey, stringValue);
      }
    }

    await pipeline.exec();
  }

  public async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!this.redis) {
      throw new Error('Redis未连接');
    }

    const fullKeys = keys.map(key => `${redisConfig.keyPrefix}${key}`);
    const values = await this.redis.mget(fullKeys);
    return values.map(value => {
      if (!value) return null;
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    });
  }

  // 清理操作
  public async clear(pattern: string): Promise<void> {
    if (!this.redis) {
      throw new Error('Redis未连接');
    }

    const fullPattern = `${redisConfig.keyPrefix}${pattern}`;
    const keys = await this.redis.keys(fullPattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  public async clearAll(): Promise<void> {
    if (!this.redis) {
      throw new Error('Redis未连接');
    }
    const keys = await this.redis.keys(`${redisConfig.keyPrefix}*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  // 关闭连接
  public async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
  }
} 