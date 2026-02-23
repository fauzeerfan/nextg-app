export class UpdateLineMasterDto {
  name?: string;
  description?: string;
  patternMultiplier?: number;
  stations?: { station: string; required: boolean; order: number }[];
  sewingConfig?: any; // bisa didefinisikan lebih ketat nanti
}