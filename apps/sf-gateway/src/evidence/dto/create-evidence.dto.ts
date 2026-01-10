import { EvidenceType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateEvidenceDto {
  @IsEnum(EvidenceType)
  type: EvidenceType;

  @IsOptional()
  @IsString()
  contentText?: string;

  @IsOptional()
  @IsString()
  contentUrl?: string;

  @IsOptional()
  @IsString()
  contentRef?: string;
}
