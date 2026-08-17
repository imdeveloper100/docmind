import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsMongoId } from 'class-validator';
import { CreateChatDto } from './dto/create-chat.dto';
import { ChatService } from './chat.service';

class DocumentIdParam {
  @IsMongoId()
  documentId: string;
}

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  ask(@Body() dto: CreateChatDto) {
    return this.chatService.ask(dto);
  }

  @Get(':documentId/history')
  history(@Param() params: DocumentIdParam) {
    return this.chatService.history(params.documentId);
  }
}
