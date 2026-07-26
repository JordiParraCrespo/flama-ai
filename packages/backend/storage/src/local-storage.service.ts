import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { BadRequestException, Injectable } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';

@Injectable()
export class LocalStorageService extends StorageService {
  private readonly uploadDir: string;

  constructor(private readonly configService: ConfigService) {
    super();
    this.uploadDir = resolve(this.configService.get('storage.uploadDir') || './uploads');
  }

  /**
   * Resolve a caller-supplied key against the upload directory, guaranteeing the
   * result stays inside it. Keys such as `../../etc/passwd` (or absolute paths)
   * would otherwise escape the sandbox, so we reject anything that resolves
   * outside `uploadDir`.
   */
  private resolveKeyPath(key: string): string {
    const filePath = resolve(this.uploadDir, key);
    const root = this.uploadDir.endsWith(sep) ? this.uploadDir : `${this.uploadDir}${sep}`;
    if (filePath !== this.uploadDir && !filePath.startsWith(root)) {
      throw new BadRequestException('Invalid storage key');
    }
    return filePath;
  }

  async upload(file: Buffer, key: string, _mimeType: string): Promise<string> {
    const filePath = this.resolveKeyPath(key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, file);
    return `/uploads/${key}`;
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolveKeyPath(key);
    await unlink(filePath);
  }

  async getSignedUrl(key: string): Promise<string> {
    return `/uploads/${key}`;
  }
}
