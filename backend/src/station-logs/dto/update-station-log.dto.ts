import { PartialType } from '@nestjs/mapped-types';
import { CreateStationLogDto } from './create-station-log.dto';

export class UpdateStationLogDto extends PartialType(CreateStationLogDto) {}
