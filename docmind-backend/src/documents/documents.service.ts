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
import { Document } from './schemas/document.schema';

interface ChunkAndEmbedResponse {
  chunks: { text: string; embedding: number[] }[];
}

export interface CreateDocumentInput {
  title: string;
  content: string;
  fileType?: string;
  sizeBytes?: number;
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
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
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
}
