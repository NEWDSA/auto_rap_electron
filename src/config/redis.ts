import { RedisOptions } from 'ioredis';

export const redisConfig: RedisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || '',
  db: parseInt(process.env.REDIS_DB || '0'),
  keyPrefix: 'auto_rap:', // 键前缀，用于区分不同应用的缓存
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  // 连接超时设置
  connectTimeout: 10000,
  // 命令超时设置
  commandTimeout: 5000,
  // 自动重连配置
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  // 保持连接配置
  keepAlive: 30000,
  // 连接名称，用于识别
  connectionName: 'auto_rap_client',
  // 是否启用离线队列
  enableOfflineQueue: true,
} as const;

// 其他配置
export const redisCacheConfig = {
  defaultTTL: 3600, // 默认缓存过期时间（秒）
} as const; 