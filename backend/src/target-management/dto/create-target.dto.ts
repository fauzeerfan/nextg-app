import { IsString, IsNumber, IsOptional, IsDateString, IsBoolean } from 'class-validator';

export class CreateTargetDto {
  @IsString()
  lineCode!: string;

  @IsString()
  station!: string;

  @IsNumber()
  indexValue!: number;

  @IsDateString()
  effectiveDate!: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;   // <-- tambahkan
}