import { Module } from '@nestjs/common';
import { PatternMastersService } from './pattern-masters.service';
import { PatternMastersController } from './pattern-masters.controller';

@Module({
  controllers: [PatternMastersController],
  providers: [PatternMastersService],
})
export class PatternMastersModule {}
