import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class IntegrationsService {
  private readonly INTEGRATIONS_URL: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.INTEGRATIONS_URL =
      this.configService.get('INTEGRATIONS_URL') || 'http://integrations:3002';
  }

  async handleWebhook(provider: string, body: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.INTEGRATIONS_URL}/webhooks/${provider}`,
          body,
        ),
      );

      return response.data;
    } catch (error) {
      throw new HttpException(
        error.response?.data?.message || 'Failed to handle webhook',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
