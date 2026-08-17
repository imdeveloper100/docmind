import {
  BadGatewayException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectModel } from '@nestjs/mongoose';
import { isAxiosError } from 'axios';
import { Model, Types } from 'mongoose';
import OpenAI from 'openai';
import { firstValueFrom } from 'rxjs';
import { DocumentsService } from '../documents/documents.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { ChatMessage } from './schemas/chat-message.schema';
import { cosineSimilarity } from './utils/cosine-similarity';

interface EmbedQueryResponse {
  embedding: number[];
}

// Mistral exposes an OpenAI-compatible surface, so the OpenAI SDK works verbatim.
const MISTRAL_BASE_URL = 'https://api.mistral.ai/v1';

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
export class ChatService {
  private readonly embedderUrl: string;
  private readonly model: string;
  private readonly mistral: OpenAI;

  constructor(
    @InjectModel(ChatMessage.name)
    private readonly chatMessageModel: Model<ChatMessage>,
    private readonly documentsService: DocumentsService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.embedderUrl = this.configService.getOrThrow<string>('EMBEDDER_URL');
    this.model = this.configService.get<string>(
      'MISTRAL_CHAT_MODEL',
      'mistral-small-latest',
    );
    this.mistral = new OpenAI({
      apiKey: this.configService.getOrThrow<string>('MISTRAL_API_KEY'),
      baseURL: MISTRAL_BASE_URL,
    });
  }

  async ask(dto: CreateChatDto) {
    const doc = await this.documentsService.findByIdWithChunks(dto.documentId);
    if (!doc.chunks?.length) {
      throw new NotFoundException(
        `Document ${dto.documentId} has no chunks to search`,
      );
    }

    let queryEmbedding: number[];
    try {
      const { data } = await firstValueFrom(
        this.httpService.post<EmbedQueryResponse>(
          `${this.embedderUrl}/embed-query`,
          { query: dto.question },
          { timeout: 60000 },
        ),
      );
      queryEmbedding = data.embedding;
    } catch (error) {
      throw new BadGatewayException(
        `Embedding service ${describeEmbedderError(error)}`,
      );
    }

    const ranked = doc.chunks
      .map((chunk) => ({
        text: chunk.text,
        score: cosineSimilarity(queryEmbedding, chunk.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const sources = ranked.map((item) => ({
      text: item.text,
      score: Math.round(item.score * 10000) / 10000,
    }));

    const context = sources.map((s) => s.text).join('\n\n');
    const prompt = `Answer the question using ONLY the context below. If the answer isn't in the context, say you don't know. Context: ${context}. Question: ${dto.question}`;

    let answer: string;
    try {
      const completion = await this.mistral.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
      });
      answer =
        completion.choices[0]?.message?.content?.trim() || "I don't know.";
    } catch (error) {
      throw new BadGatewayException(
        `Mistral chat completion failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    await this.chatMessageModel.create({
      documentId: new Types.ObjectId(dto.documentId),
      question: dto.question,
      answer,
    });

    return { answer, sources };
  }

  async history(documentId: string) {
    if (!Types.ObjectId.isValid(documentId)) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    const messages = await this.chatMessageModel
      .find({ documentId: new Types.ObjectId(documentId) })
      .select({ question: 1, answer: 1, createdAt: 1 })
      .sort({ createdAt: 1 })
      .lean()
      .exec();

    return messages.map((msg) => ({
      id: msg._id.toString(),
      question: msg.question,
      answer: msg.answer,
      createdAt: msg.createdAt,
    }));
  }
}
