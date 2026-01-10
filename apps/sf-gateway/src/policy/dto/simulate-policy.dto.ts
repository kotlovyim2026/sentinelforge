import { Type } from 'class-transformer';
import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class SimulationScenarioDto {
  @IsObject()
  subject: Record<string, unknown>;

  @IsString()
  action: string;

  @IsOptional()
  @IsObject()
  resource?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}

export class SimulatePolicyDto {
  @IsObject()
  document: Record<string, unknown>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SimulationScenarioDto)
  scenarios: SimulationScenarioDto[];
}
