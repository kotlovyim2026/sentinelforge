import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';

@Injectable()
export class HealthService {
  private readonly AI_SERVICE_URL: string;
  private readonly ORCHESTRATOR_URL: string;
  private readonly INTEGRATIONS_URL: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly rabbitmqService: RabbitMQService,
  ) {
    this.AI_SERVICE_URL =
      this.configService.get('AI_SERVICE_URL') || 'http://ai-service:8002';
    this.ORCHESTRATOR_URL =
      this.configService.get('ORCHESTRATOR_URL') || 'http://orchestrator:8001';
    this.INTEGRATIONS_URL =
      this.configService.get('INTEGRATIONS_URL') || 'http://integrations:3002';
  }

  async checkPostgres() {
    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      const result = await this.prismaService.$queryRaw<
        Array<{ count: bigint }>
      >`SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'`;
      return {
        name: 'postgres',
        type: 'database',
        status: 'healthy',
        ok: true,
        connectionCount: Number(result[0]?.count || 0),
      };
    } catch (error) {
      return {
        name: 'postgres',
        type: 'database',
        status: 'unhealthy',
        ok: false,
        message: error.message,
      };
    }
  }

  async getSystemHealth() {
    const services = [
      { name: 'gateway', url: null },
      { name: 'ai-service', url: `${this.AI_SERVICE_URL}/health` },
      { name: 'orchestrator', url: `${this.ORCHESTRATOR_URL}/health` },
      { name: 'integrations', url: `${this.INTEGRATIONS_URL}/health` },
    ];

    const [serviceResults, postgresHealth, redisHealth, rabbitmqHealth] =
      await Promise.all([
        Promise.allSettled(
          services.map(async (service) => {
            if (!service.url) {
              return { name: service.name, status: 'healthy', ok: true };
            }
            try {
              const response = await firstValueFrom(
                this.httpService.get(service.url),
              );
              const data = response.data;
              return {
                name: service.name,
                status: data.ok ? 'healthy' : 'unhealthy',
                ok: data.ok,
              };
            } catch (error) {
              return { name: service.name, status: 'unhealthy', ok: false };
            }
          }),
        ),
        this.checkPostgres(),
        this.redisService.checkHealth(),
        this.rabbitmqService.checkHealth(),
      ]);

    const services_data = serviceResults.map((result, idx) =>
      result.status === 'fulfilled'
        ? result.value
        : { name: services[idx].name, status: 'unhealthy', ok: false },
    );

    const infraResults = [postgresHealth, redisHealth, rabbitmqHealth];

    const allHealthy =
      services_data.every((s) => s.ok) && infraResults.every((i) => i.ok);

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      services: services_data,
      infrastructure: infraResults,
      timestamp: new Date().toISOString(),
    };
  }
}
