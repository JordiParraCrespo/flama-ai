/**
 * A ZIP writer for the store package: deflate, CRC-32 and the three record
 * types of the format (APPNOTE.TXT §4.3), over Node's own `zlib`.
 *
 * The archive is reproducible. Entries are sorted, every timestamp is the
 * format's epoch (1980-01-01 00:00) and no host metadata is recorded, so the
 * same `dist/` always zips to the same bytes — a release can be rebuilt and
 * compared, and a diff in the package means a diff in the code.
 */
import { crc32, deflateRawSync } from 'node:zlib';

const DOS_EPOCH_DATE = (0 << 9) | (1 << 5) | 1; // 1980-01-01
const DOS_EPOCH_TIME = 0;
const VERSION = 20; // 2.0: deflate

/**
 * @param {{ name: string, data: Buffer }[]} files paths use `/`, relative to the archive root
 * @returns {Buffer}
 */
export function zip(files) {
  const sorted = [...files].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const { name, data } of sorted) {
    const fileName = Buffer.from(name, 'utf8');
    const compressed = deflateRawSync(data, { level: 9 });
    // Store whatever deflate does not shrink (icons, mostly).
    const stored = compressed.length >= data.length;
    const body = stored ? data : compressed;
    const method = stored ? 0 : 8;
    const checksum = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(VERSION, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(DOS_EPOCH_TIME, 10);
    local.writeUInt16LE(DOS_EPOCH_DATE, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(fileName.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, fileName, body);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(VERSION, 4);
    central.writeUInt16LE(VERSION, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(DOS_EPOCH_TIME, 12);
    central.writeUInt16LE(DOS_EPOCH_DATE, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(fileName.length, 28);
    // extra, comment, disk, internal and external attributes: all zero
    central.writeUInt32LE(offset, 42);
    centrals.push(central, fileName);

    offset += local.length + fileName.length + body.length;
  }

  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(sorted.length, 8);
  end.writeUInt16LE(sorted.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...locals, directory, end]);
}
