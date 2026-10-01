/**
 * Where uploaded files live. The contract is the same whichever back-end the
 * module selected: a file is stored under a **key**, the key is what callers
 * persist, and a URL is derived from it at read time with `getSignedUrl` (a
 * private bucket's URL is signed and expires, so a URL is never worth storing).
 */
export abstract class StorageService {
  /** Store `file` under `key`, overwriting what was there; resolves to the key. */
  abstract upload(file: Buffer, key: string, mimeType: string): Promise<string>;
  abstract delete(key: string): Promise<void>;
  /**
   * A URL a browser can load `key` from. An object store signs it for
   * `expiresIn` seconds; the local back-end serves a stable public URL and
   * ignores it.
   */
  abstract getSignedUrl(key: string, expiresIn?: number): Promise<string>;
}
