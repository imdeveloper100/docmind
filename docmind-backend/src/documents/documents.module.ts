import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ChatMessage,
  ChatMessageSchema,
} from '../chat/schemas/chat-message.schema';
import { CloudinaryService } from './cloudinary';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { Document, DocumentSchema } from './schemas/document.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: Document.name, schema: DocumentSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema },
    ]),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, CloudinaryService],
  exports: [DocumentsService, MongooseModule],
})
export class DocumentsModule {}
