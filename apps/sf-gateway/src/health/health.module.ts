import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { RabbitMQModule } from '../rabbitmq/rabbitmq.module';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    PrismaModule,
    RedisModule,
    RabbitMQModule,
  ],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
