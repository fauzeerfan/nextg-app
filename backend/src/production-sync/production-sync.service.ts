import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductionSyncService {
  private logger = new Logger('ProductionSync');

  constructor(private prisma: PrismaService) {}

  async syncFromCuttingAPI(data: any[]) {
    for (const row of data) {
      const opNumber = row.nomorOp;
      const fg = row.itemNumberFinishGood;
      const name = row.itemNameFinishGood;
      const qtyOp = parseInt(row.qtyOp || '0');
      const qtyEntan = parseInt(row.grandTotalCutting || '0');

      const style = opNumber.substring(0, 4);

      const line = await this.prisma.lineMaster.findUnique({
        where: { code: style },
      });

      if (!line) continue;

      let op = await this.prisma.productionOrder.findUnique({
        where: { opNumber },
      });

      ////////////////////////////////////////////////////////////////
      // CREATE NEW OP
      ////////////////////////////////////////////////////////////////
      if (!op) {
        await this.prisma.productionOrder.create({
          data: {
            opNumber,
            lineId: line.id,
            styleCode: style,
            itemNumberFG: fg,
            itemNameFG: name,
            qtyOp,
            qtyEntan,
            currentStation: 'CUTTING_ENTAN',
          },
        });

        this.logger.log(`NEW OP CREATED ${opNumber}`);
        continue;
      }

      ////////////////////////////////////////////////////////////////
      // UPDATE ENTAN (ACCUMULATE)
      ////////////////////////////////////////////////////////////////
      if (qtyEntan > op.qtyEntan) {
        await this.prisma.productionOrder.update({
          where: { id: op.id },
          data: { qtyEntan },
        });

        this.logger.log(`UPDATE ENTAN ${opNumber} = ${qtyEntan}`);
      }
    }

    return { success: true };
  }
}
