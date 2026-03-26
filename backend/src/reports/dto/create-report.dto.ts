export class CreateReportDto {
  reportType: string;
  startDate?: Date;
  endDate?: Date;
  lineCode?: string;
  station?: string;
  opNumber?: string;
}