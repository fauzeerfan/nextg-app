import { Module } from '@nestjs/common';
import { OpReplacementsService } from './op-replacements.service';
import { OpReplacementsController } from './op-replacements.controller';

@Module({
  controllers: [OpReplacementsController],
  providers: [OpReplacementsService],
})
export class OpReplacementsModule {}
