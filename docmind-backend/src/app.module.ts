import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatModule } from './chat/chat.module';
import { DocumentsModule } from './documents/documents.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const uri = config.get<string>('MONGO_URI');
        if (!uri) {
          throw new Error(
            'MONGO_URI is not set. Add it in Vercel Project Settings → Environment Variables.',
          );
        }
        return {
          uri,
          // Do not block the whole function on Atlas during cold start.
          lazyConnection: true,
          serverSelectionTimeoutMS: 8000,
        };
      },
    }),
    DocumentsModule,
    ChatModule,
  ],
})
export class AppModule {}
