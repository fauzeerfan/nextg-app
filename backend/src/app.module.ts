import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { DepartmentsModule } from './departments/departments.module';
import { JobTitlesModule } from './job-titles/job-titles.module';
import { ProductionOrdersModule } from './production-orders/production-orders.module';
import { StationLogsModule } from './station-logs/station-logs.module';
import { MaterialRequestsModule } from './material-requests/material-requests.module';
import { OpReplacementsModule } from './op-replacements/op-replacements.module';
import { PatternMastersModule } from './pattern-masters/pattern-masters.module';

@Module({
  imports: [AuthModule, UsersModule, RolesModule, DepartmentsModule, JobTitlesModule, ProductionOrdersModule, StationLogsModule, MaterialRequestsModule, OpReplacementsModule, PatternMastersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
