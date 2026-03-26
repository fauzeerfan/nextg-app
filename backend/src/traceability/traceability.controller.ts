import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { TraceabilityService } from './traceability.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('traceability')
@UseGuards(JwtAuthGuard)
export class TraceabilityController {
  constructor(private readonly traceabilityService: TraceabilityService) {}

  @Get('op/:opNumber')
  async traceByOp(@Param('opNumber') opNumber: string) {
    try {
      return await this.traceabilityService.traceByOpNumber(opNumber);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`Failed to trace OP ${opNumber}`);
    }
  }

  @Get('surat-jalan/:suratJalan')
  async traceBySuratJalan(@Param('suratJalan') suratJalan: string) {
    try {
      return await this.traceabilityService.traceBySuratJalan(suratJalan);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(
        `Failed to trace Surat Jalan ${suratJalan}`,
      );
    }
  }

  @Get('fg/:fgNumber')
  async traceByFG(@Param('fgNumber') fgNumber: string) {
    try {
      return await this.traceabilityService.traceByFGNumber(fgNumber);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`Failed to trace FG ${fgNumber}`);
    }
  }

  @Get('qr/:qrCode')
  async traceByQR(@Param('qrCode') qrCode: string) {
    try {
      return await this.traceabilityService.traceByQrCode(qrCode);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`Failed to trace QR ${qrCode}`);
    }
  }

  @Get('search')
  async search(
    @Query('query') query: string,
    @Query('type') type: 'op' | 'surat-jalan' | 'fg' | 'qr' = 'op',
  ) {
    try {
      switch (type) {
        case 'op':
          return await this.traceabilityService.traceByOpNumber(query);
        case 'surat-jalan':
          return await this.traceabilityService.traceBySuratJalan(query);
        case 'fg':
          return await this.traceabilityService.traceByFGNumber(query);
        case 'qr':
          return await this.traceabilityService.traceByQrCode(query);
        default:
          return await this.traceabilityService.traceByOpNumber(query);
      }
    } catch (error) {
      throw new NotFoundException(
        `No results found for ${type}: ${query}`,
      );
    }
  }
}