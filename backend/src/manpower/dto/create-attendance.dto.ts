import { IsString, IsNotEmpty } from 'class-validator';

export class CreateAttendanceDto {
  @IsString()
  @IsNotEmpty()
  nik: string;

  @IsString()
  @IsNotEmpty()
  lineCode: string;

  @IsString()
  @IsNotEmpty()
  station: string;
}