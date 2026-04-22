import { PartialType } from '@nestjs/mapped-types';
import { CreatePlannedOrderDto } from './create-planned-order.dto';
import { IsOptional, IsString, IsIn } from 'class-validator';

export class UpdatePlannedOrderDto extends PartialType(CreatePlannedOrderDto) {
  @IsOptional()
  @IsString()
  @IsIn(['DRAFT', 'SIMULATED', 'EXPORTED'])
  status?: string;
}