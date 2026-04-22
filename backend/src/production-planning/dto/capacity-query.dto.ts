import { IsOptional, IsString, IsDateString } from 'class-validator';

export class CapacityQueryDto {
  @IsOptional()
  @IsString()
  lineCode?: string;

  @IsOptional()
  @IsString()
  station?: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}