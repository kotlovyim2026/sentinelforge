import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, Connection } from 'amqplib';

@Injectable()
export class RabbitMQService {
  private readonly rabbitUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.rabbitUrl =
      this.configService.get('RABBITMQ_URL') ||
      'amqp://guest:guest@rabbitmq:5672';
  }

  async getConnection(): Promise<Connection> {
    return await connect(this.rabbitUrl);
  }

  async checkHealth() {
    let connection: Connection;
    try {
      connection = await this.getConnection();
      const channel = await connection.createChannel();
      await channel.close();
      await connection.close();
      return {
        name: 'rabbitmq',
        type: 'queue' as const,
        status: 'healthy' as const,
        ok: true,
      };
    } catch (error) {
      if (connection) {
        try {
          await connection.close();
        } catch {}
      }
      return {
        name: 'rabbitmq',
        type: 'queue' as const,
        status: 'unhealthy' as const,
        ok: false,
        message: error.message,
      };
    }
  }
}
