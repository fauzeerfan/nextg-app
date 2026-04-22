import { IsString, IsDateString, IsOptional, IsArray, ValidateNested, IsInt, Min, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseOrderDetailDto {
  @IsString()
  materialId!: string;

  @IsInt()
  @Min(1)
  orderedQty!: number;

  @IsOptional()
  @IsNumber()
  unitPrice?: number;
}

export class CreatePurchaseOrderDto {
  @IsString()
  poNumber!: string;

  @IsString()
  supplierId!: string;

  @IsDateString()
  orderDate!: string;

  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderDetailDto)
  details!: PurchaseOrderDetailDto[];
}