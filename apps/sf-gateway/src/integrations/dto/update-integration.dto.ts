import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateIntegrationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
