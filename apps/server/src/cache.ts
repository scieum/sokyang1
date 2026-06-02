import Redis from "ioredis";
import { config } from "./config.js";

/**
 * 캐시 추상화. Redis 가 설정/연결되면 사용하고,
 * 실패하면 인메모리 Map 으로 자동 폴백한다. (개발 편의성 우선)
 */
interface Cache {
  set(key: string, value: unknown): Promise<void>;
  get<T>(key: string): Promise<T | null>;
}

class MemoryCache implements Cache {
  private store = new Map<string, string>();
  async set(key: string, value: unknown) {
    this.store.set(key, JSON.stringify(value));
  }
  async get<T>(key: string): Promise<T | null> {
    const raw = this.store.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }
}

class RedisCache implements Cache {
  constructor(private client: Redis) {}
  async set(key: string, value: unknown) {
    await this.client.set(key, JSON.stringify(value));
  }
  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }
}

export function createCache(): Cache {
  if (!config.redisUrl) {
    console.log("[cache] REDIS_URL 미설정 → 인메모리 캐시 사용");
    return new MemoryCache();
  }
  try {
    const client = new Redis(config.redisUrl, {
      lazyConnect: false,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // 재시도 비활성화: 실패 시 폴백 유도
    });
    client.on("error", (err) => {
      console.warn("[cache] Redis 오류, 인메모리 폴백 권장:", err.message);
    });
    console.log("[cache] Redis 캐시 사용:", config.redisUrl);
    return new RedisCache(client);
  } catch (e) {
    console.warn("[cache] Redis 초기화 실패 → 인메모리 캐시 사용");
    return new MemoryCache();
  }
}

/** 캐시 키 */
export const CacheKeys = {
  routes: "sbus:routes",
  stops: "sbus:stops",
  vehicles: "sbus:vehicles",
  arrivals: (stopId: string) => `sbus:arrivals:${stopId}`,
};
