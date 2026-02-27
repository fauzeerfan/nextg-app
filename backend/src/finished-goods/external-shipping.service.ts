import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ExternalShippingService {
  private readonly baseUrl = 'http://202.52.15.30:998/miniapps/admin/api';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Mendapatkan daftar semua surat jalan
   */
  async getDokumenSuratJalan(): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/doksuratjalan`),
      );
      return response.data;
    } catch (error) {
      throw new HttpException(
        'Gagal mengambil data surat jalan dari server eksternal',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Mendapatkan detail item dari suatu surat jalan
   * @param noSuratJalan nomor surat jalan
   */
  async getItemsSuratJalan(noSuratJalan: string): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/listitemsuratjalan/${noSuratJalan}`),
      );
      return response.data;
    } catch (error) {
      throw new HttpException(
        `Gagal mengambil detail surat jalan ${noSuratJalan}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Validasi apakah nomor surat jalan ada di sistem eksternal
   */
  async validateSuratJalan(noSuratJalan: string): Promise<boolean> {
    try {
      const items = await this.getItemsSuratJalan(noSuratJalan);
      return Array.isArray(items) && items.length > 0;
    } catch {
      return false;
    }
  }
}