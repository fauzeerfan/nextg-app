import { PartialType } from '@nestjs/mapped-types';
import { CreateOpReplacementDto } from './create-op-replacement.dto';

export class UpdateOpReplacementDto extends PartialType(CreateOpReplacementDto) {}
