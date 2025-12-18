import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { JobTitlesService } from './job-titles.service';

@Controller('job-titles')
export class JobTitlesController {
  constructor(private readonly jobTitlesService: JobTitlesService) {}

  @Post()
  create(@Body() createJobTitleDto: any) {
    return this.jobTitlesService.create(createJobTitleDto);
  }

  @Get()
  findAll() {
    return this.jobTitlesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    // FIX: Hapus tanda '+'
    return this.jobTitlesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateJobTitleDto: any) {
    // FIX: Hapus tanda '+'
    return this.jobTitlesService.update(id, updateJobTitleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    // FIX: Hapus tanda '+'
    return this.jobTitlesService.remove(id);
  }
}