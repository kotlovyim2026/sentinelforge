import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class CreatePolicyVersionDto {
  @IsString()
  policyName: string;

  @IsObject()
  document: Record<string, unknown>;

  @IsOptional()
  @IsString()
  changeSummary?: string;

  @IsOptional()
  @IsBoolean()
  activate?: boolean;
}
