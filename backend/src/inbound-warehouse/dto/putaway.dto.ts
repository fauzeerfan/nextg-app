import { IsString, IsOptional } from 'class-validator';

export class PutawayItemDto {
  @IsString()
  receivingDetailId!: string;

  @IsString()
  storageLocation!: string;

  @IsOptional()
  @IsString()
  batchLotNumber?: string;
}

export class PutawayDto {
  @IsString()
  receivingDetailId!: string;

  @IsString()
  storageLocation!: string;

  @IsOptional()
  @IsString()
  batchLotNumber?: string;
}