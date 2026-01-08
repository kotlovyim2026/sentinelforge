import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: RedisClientType;
  private readonly redisUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.redisUrl = this.configService.get('REDIS_URL') || 'redis://redis:6379';
  }

  async getClient(): Promise<RedisClientType> {
    if (!this.client) {
      this.client = createClient({ url: this.redisUrl });
      await this.client.connect();
    }
    return this.client;
  }

  async checkHealth() {
    try {
      const client = await this.getClient();
      await client.ping();
      const info = await client.info('clients');
      const match = info.match(/connected_clients:(\d+)/);
      const connectionCount = match ? parseInt(match[1], 10) : 0;
      return {
        name: 'redis',
        type: 'cache' as const,
        status: 'healthy' as const,
        ok: true,
        connectionCount,
      };
    } catch (error) {
      return {
        name: 'redis',
        type: 'cache' as const,
        status: 'unhealthy' as const,
        ok: false,
        message: error.message,
      };
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.disconnect();
    }
  }
}
