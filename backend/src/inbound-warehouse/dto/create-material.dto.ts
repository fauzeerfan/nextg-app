import { IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';

export class CreateMaterialDto {
  @IsString()
  materialNumber!: string;

  @IsString()
  description!: string;

  @IsString()
  uom!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsInt()
  minStock?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}