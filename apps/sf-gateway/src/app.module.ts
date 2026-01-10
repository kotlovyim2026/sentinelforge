import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';
import { HealthModule } from './health/health.module';
import { AiModule } from './ai/ai.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { AuthModule } from './auth/auth.module';
import { RequestContextModule } from './common/request-context.module';
import { RequestContextMiddleware } from './common/request-context.middleware';
import { ContextLoggerInterceptor } from './common/context-logger.interceptor';
import { PolicyModule } from './policy/policy.module';
import { IncidentsModule } from './incidents/incidents.module';
import { EvidenceModule } from './evidence/evidence.module';
import { PlaybooksModule } from './playbooks/playbooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 20,
      },
    ]),
    PrismaModule,
    RedisModule,
    RabbitMQModule,
    HealthModule,
    AiModule,
    IntegrationsModule,
    AuthModule,
    RequestContextModule,
    PolicyModule,
    IncidentsModule,
    EvidenceModule,
    PlaybooksModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ContextLoggerInterceptor,
    },
    RequestContextMiddleware,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
