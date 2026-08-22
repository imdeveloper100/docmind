import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DocumentDocument = HydratedDocument<Document>;

@Schema({ _id: false })
export class Chunk {
  @Prop({ required: true })
  text: string;

  @Prop({ type: [Number], required: true })
  embedding: number[];
}

export const ChunkSchema = SchemaFactory.createForClass(Chunk);

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Document {
  @Prop({ required: true })
  title: string;

  @Prop({ default: 'TXT' })
  fileType: string;

  @Prop({ default: 0 })
  sizeBytes: number;

  @Prop({ type: [ChunkSchema], default: [] })
  chunks: Chunk[];

  @Prop()
  cloudinaryPublicId?: string;

  @Prop()
  cloudinaryUrl?: string;

  createdAt?: Date;
}

export const DocumentSchema = SchemaFactory.createForClass(Document);
