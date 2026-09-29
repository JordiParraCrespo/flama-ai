import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageService } from '@flama/backend-storage';
import { Injectable } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

@Injectable()
export class S3StorageService extends StorageService {
  private s3: S3Client;
  private bucket: string;

  constructor(private readonly configService: ConfigService) {
    super();
    this.bucket = this.configService.get('s3.bucket') || 'flama';
    this.s3 = new S3Client({
      region: this.configService.get('s3.region') || 'auto',
      endpoint: this.configService.get('s3.endpoint'),
      credentials: {
        accessKeyId: this.configService.get('s3.accessKeyId') || '',
        secretAccessKey: this.configService.get('s3.secretAccessKey') || '',
      },
      forcePathStyle: true,
    });
  }

  async upload(file: Buffer, key: string, mimeType: string): Promise<string> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: mimeType,
      }),
    );
    return key;
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn });
  }
}
