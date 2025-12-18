import { PartialType } from '@nestjs/mapped-types';
import { CreatePatternMasterDto } from './create-pattern-master.dto';

export class UpdatePatternMasterDto extends PartialType(CreatePatternMasterDto) {}
