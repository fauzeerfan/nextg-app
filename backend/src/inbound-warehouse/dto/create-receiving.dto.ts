import { IsString, IsOptional, IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ReceivingDetailDto {
  @IsString()
  materialId!: string;

  @IsOptional()
  @IsString()
  poDetailId?: string;

  @IsInt()
  @Min(1)
  receivedQty!: number;

  @IsInt()
  @Min(0)
  acceptedQty!: number;

  @IsInt()
  @Min(0)
  rejectedQty!: number;

  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  batchLotNumber?: string;
}

export class CreateReceivingDto {
  @IsString()
  supplierId!: string;

  @IsOptional()
  @IsString()
  poId?: string;

  @IsString()
  deliveryNoteNumber!: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceivingDetailDto)
  details!: ReceivingDetailDto[];
}