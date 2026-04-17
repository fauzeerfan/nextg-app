import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateTargetDto {
  @IsString()
  lineCode!: string;

  @IsNumber()
  indexValue!: number;

  @IsDateString()
  effectiveDate!: string;

  @IsOptional()
  @IsString()
  note?: string;
}