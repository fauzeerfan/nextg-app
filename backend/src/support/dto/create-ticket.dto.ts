import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  subject: string;

  @IsString()
  @IsIn(['FEATURE', 'BUG', 'DATA', 'OTHER'])
  category: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: string;
}