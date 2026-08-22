import {
  BadGatewayException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { HttpService } from '@nestjs/axios';
import { isAxiosError } from 'axios';
import { Model, Types } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { ChatMessage } from '../chat/schemas/chat-message.schema';
import { CloudinaryService } from './cloudinary';
import { Document } from './schemas/document.schema';

interface ChunkAndEmbedResponse {
  chunks: { text: string; embedding: number[] }[];
}

export interface CreateDocumentInput {
  title: string;
  content: string;
  fileType?: string;
  sizeBytes?: number;
  cloudinaryPublicId?: string;
  cloudinaryUrl?: string;
}

export interface CreateFromUploadInput {
  title: string;
  content: string;
  fileType: string;
  sizeBytes: number;
  buffer: Buffer;
  filename: string;
}

function describeEmbedderError(error: unknown): string {
  if (isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: unknown })?.detail;
    if (typeof detail === 'string' && detail) {
      return detail;
    }
    if (error.response) {
      return `responded ${error.response.status}`;
    }
    return `is unreachable (${error.message})`;
  }
  return error instanceof Error ? error.message : String(error);
}

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(Document.name) private readonly documentModel: Model<Document>,
    @InjectModel(ChatMessage.name)
    private readonly chatMessageModel: Model<ChatMessage>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  private embedderUrl() {
    return this.configService.getOrThrow<string>('EMBEDDER_URL');
  }

  async create(input: CreateDocumentInput) {
    const documentId = new Types.ObjectId();

    let chunks: { text: string; embedding: number[] }[];
    try {
      const { data } = await firstValueFrom(
        this.httpService.post<ChunkAndEmbedResponse>(
          `${this.embedderUrl()}/chunk-and-embed`,
          { text: input.content, documentId: documentId.toHexString() },
          { timeout: 120000 },
        ),
      );
      chunks = data.chunks;
    } catch (error) {
      throw new BadGatewayException(
        `Embedding service ${describeEmbedderError(error)}`,
      );
    }

    const doc = await this.documentModel.create({
      _id: documentId,
      title: input.title,
      fileType: input.fileType ?? 'TXT',
      sizeBytes: input.sizeBytes ?? Buffer.byteLength(input.content, 'utf8'),
      chunks,
      cloudinaryPublicId: input.cloudinaryPublicId,
      cloudinaryUrl: input.cloudinaryUrl,
    });

    return {
      id: doc._id.toString(),
      title: doc.title,
      fileType: doc.fileType,
      sizeBytes: doc.sizeBytes,
      chunkCount: chunks.length,
      createdAt: doc.createdAt,
    };
  }

  async findAll() {
    const docs = await this.documentModel
      .find()
      .select({ title: 1, fileType: 1, sizeBytes: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return docs.map((doc) => ({
      id: doc._id.toString(),
      title: doc.title,
      fileType: doc.fileType ?? 'TXT',
      sizeBytes: doc.sizeBytes ?? 0,
      createdAt: doc.createdAt,
    }));
  }

  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    const doc = await this.documentModel.findById(id).lean().exec();
    if (!doc) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    return {
      id: doc._id.toString(),
      title: doc.title,
      fileType: doc.fileType ?? 'TXT',
      sizeBytes: doc.sizeBytes ?? 0,
      chunkCount: doc.chunks?.length ?? 0,
      createdAt: doc.createdAt,
    };
  }

  async findByIdWithChunks(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    const doc = await this.documentModel.findById(id).lean().exec();
    if (!doc) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    return doc;
  }

  async createFromUpload(input: CreateFromUploadInput) {
    const uploaded = await this.cloudinary.uploadRaw(
      input.buffer,
      input.filename,
    );

    try {
      return await this.create({
        title: input.title,
        content: input.content,
        fileType: input.fileType,
        sizeBytes: input.sizeBytes,
        cloudinaryPublicId: uploaded.public_id,
        cloudinaryUrl: uploaded.secure_url,
      });
    } catch (error) {
      await this.cloudinary.destroyRaw(uploaded.public_id).catch(() => {
        /* original file is orphaned; the embed/save error is more useful */
      });
      throw error;
    }
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    const doc = await this.documentModel.findById(id).lean().exec();
    if (!doc) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    if (doc.cloudinaryPublicId) {
      await this.cloudinary.destroyRaw(doc.cloudinaryPublicId);
    }

    await this.chatMessageModel.deleteMany({ documentId: doc._id }).exec();
    await this.documentModel.deleteOne({ _id: doc._id }).exec();

    return { id: doc._id.toString(), deleted: true };
  }
}
