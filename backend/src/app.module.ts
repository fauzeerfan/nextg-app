import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductionOrdersModule } from './production-orders/production-orders.module';
import { StationLogsModule } from './station-logs/station-logs.module';
import { PatternMastersModule } from './pattern-masters/pattern-masters.module';
import { LineMastersModule } from './line-masters/line-masters.module';
import { ProductionSyncModule } from './production-sync/production-sync.module';
import { MesModule } from './mes/mes.module';
import { CuttingEntanModule } from './cutting-entan/cutting-entan.module';
import { IotModule } from './iot/iot.module';
import { CheckPanelModule } from './check-panel/check-panel.module';
import { PackingModule } from './packing/packing.module';
import { FinishedGoodsModule } from './finished-goods/finished-goods.module';
import { ReportsModule } from './reports/reports.module';
import { TraceabilityModule } from './traceability/traceability.module';
import { EmployeeModule } from './employee/employee.module';
import { ManpowerModule } from './manpower/manpower.module';
import { TargetManagementModule } from './target-management/target-management.module';
import { TargetMonitoringModule } from './target-monitoring/target-monitoring.module';
import { AiModule } from './ai/ai.module';
import { ProductionPlanningModule } from './production-planning/production-planning.module';
import { InboundWarehouseModule } from './inbound-warehouse/inbound-warehouse.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    ProductionOrdersModule,
    StationLogsModule,
    PatternMastersModule,
    LineMastersModule,
    ProductionSyncModule,
    MesModule,
    CuttingEntanModule,
    IotModule,
    CheckPanelModule,
    PackingModule,
    FinishedGoodsModule,
    ReportsModule,
    TraceabilityModule,
    EmployeeModule,
    ManpowerModule,
    TargetManagementModule,
    TargetMonitoringModule,
    AiModule,
    ProductionPlanningModule,
    InboundWarehouseModule,
    ChatModule,
  ],
  controllers: [AppController],
})
export class AppModule {}