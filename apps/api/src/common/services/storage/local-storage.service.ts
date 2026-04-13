import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Injectable } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';

@Injectable()
export class LocalStorageService extends StorageService {
  private readonly uploadDir: string;

  constructor(private readonly configService: ConfigService) {
    super();
    this.uploadDir = this.configService.get('UPLOAD_DIR') || './uploads';
  }

  async upload(file: Buffer, key: string, _mimeType: string): Promise<string> {
    const filePath = join(this.uploadDir, key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, file);
    return `/uploads/${key}`;
  }

  async delete(key: string): Promise<void> {
    const filePath = join(this.uploadDir, key);
    await unlink(filePath);
  }

  async getSignedUrl(key: string): Promise<string> {
    return `/uploads/${key}`;
  }
}
