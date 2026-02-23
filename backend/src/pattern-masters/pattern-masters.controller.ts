// backend/src/pattern-masters/pattern-masters.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { PatternMastersService } from './pattern-masters.service';

@Controller('pattern-masters')
export class PatternMastersController {
  constructor(private readonly service: PatternMastersService) {}

  @Post()
  create(@Body() dto: any) {
    return this.service.upsert(dto);
  }

  @Get()
  findAll(@Query('style') style?: string, @Query('lineCode') lineCode?: string) {
    if (lineCode) {
      return this.service.findByLineCode(lineCode);
    }
    if (style) {
      return this.service.findByStyle(style);
    }
    return this.service.findAll();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('images', 20, {
      storage: diskStorage({
        destination: './uploads/patterns',
        filename: (req, file, cb) => {
          // Generate a unique filename with original extension
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
          return cb(new BadRequestException('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadFiles(@UploadedFiles() files: Array<Express.Multer.File>) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }
    // Return an array of filenames (the generated ones)
    return files.map(file => file.filename);
  }
}