import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsMongoId } from 'class-validator';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DocumentsService } from './documents.service';
import {
  extractText,
  getSupportedExtension,
  MAX_UPLOAD_BYTES,
} from './utils/extract-text';

class DocumentIdParam {
  @IsMongoId()
  id: string;
}

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  create(@Body() dto: CreateDocumentDto) {
    return this.documentsService.create(dto);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file was uploaded.');
    }

    const extension = getSupportedExtension(file.originalname);
    if (!extension) {
      throw new BadRequestException(
        `Unsupported file type. Upload a PDF, DOCX, or TXT file.`,
      );
    }

    const content = await extractText(file.buffer, extension);

    return this.documentsService.createFromUpload({
      title: title?.trim() || file.originalname,
      content,
      fileType: extension.toUpperCase(),
      sizeBytes: file.size,
      buffer: file.buffer,
      filename: file.originalname,
    });
  }

  @Get()
  findAll() {
    return this.documentsService.findAll();
  }

  @Get(':id')
  findOne(@Param() params: DocumentIdParam) {
    return this.documentsService.findOne(params.id);
  }

  @Delete(':id')
  remove(@Param() params: DocumentIdParam) {
    return this.documentsService.remove(params.id);
  }
}
