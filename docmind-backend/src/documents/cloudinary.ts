import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  private folder() {
    return this.configService.get<string>('CLOUDINARY_FOLDER') || 'docmind';
  }

  private ensureConfigured() {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');
    if (!cloudName || !apiKey || !apiSecret) {
      throw new BadGatewayException(
        'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
      );
    }
  }

  uploadRaw(buffer: Buffer, filename: string): Promise<UploadApiResponse> {
    this.ensureConfigured();
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          folder: this.folder(),
          filename_override: filename,
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error || !result) {
            reject(
              new BadGatewayException(
                `Cloudinary upload failed: ${error?.message ?? 'no result'}`,
              ),
            );
            return;
          }
          resolve(result);
        },
      );
      stream.end(buffer);
    });
  }

  async destroyRaw(publicId: string) {
    this.ensureConfigured();
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'raw',
    });
    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new BadGatewayException(
        `Cloudinary delete failed: ${result.result ?? 'unknown error'}`,
      );
    }
  }
}
