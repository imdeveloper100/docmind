import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class CreateChatDto {
  @IsMongoId()
  documentId: string;

  @IsString()
  @IsNotEmpty()
  question: string;
}
