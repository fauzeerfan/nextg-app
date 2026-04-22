import { IsString, IsInt, IsDateString, IsOptional, Min, Max } from 'class-validator';

export class CreatePlannedOrderDto {
  @IsString()
  itemNumberFG!: string;

  @IsOptional()
  @IsString()
  styleCode?: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  priority?: number = 2;

  @IsOptional()
  @IsString()
  assignedLineCode?: string;

  @IsOptional()
  @IsString()
  note?: string;
}