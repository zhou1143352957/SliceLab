export interface ZipEntry {
  fileName: string
  data: Uint8Array
  lastModified?: Date
}

interface DosDateTime {
  date: number
  time: number
}

const ZIP_VERSION = 20
const ZIP_METHOD_STORE = 0
const ZIP_UTF8_FLAG = 0x0800
const CRC32_TABLE = buildCrc32Table()
const textEncoder = new TextEncoder()

function buildCrc32Table(): Uint32Array {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
}

// 计算 Zip 条目的 CRC32 校验值（标准 Zip 必填字段）。
function calcCrc32(input: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < input.length; i += 1) {
    crc = CRC32_TABLE[(crc ^ input[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function toDosDateTime(date: Date): DosDateTime {
  const year = Math.min(Math.max(date.getFullYear(), 1980), 2107)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const seconds = Math.floor(date.getSeconds() / 2)

  return {
    date: ((year - 1980) << 9) | (month << 5) | day,
    time: (hours << 11) | (minutes << 5) | seconds,
  }
}

function encodeFileName(fileName: string): Uint8Array {
  const normalizedName = fileName.trim() || 'slice.png'
  return textEncoder.encode(normalizedName)
}

function writeUint16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value & 0xffff, true)
}

function writeUint32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value >>> 0, true)
}

function createLocalHeader(
  fileNameBytes: Uint8Array,
  crc32: number,
  size: number,
  dosDateTime: DosDateTime
): Uint8Array {
  const header = new Uint8Array(30 + fileNameBytes.length)
  const view = new DataView(header.buffer)
  writeUint32(view, 0, 0x04034b50)
  writeUint16(view, 4, ZIP_VERSION)
  writeUint16(view, 6, ZIP_UTF8_FLAG)
  writeUint16(view, 8, ZIP_METHOD_STORE)
  writeUint16(view, 10, dosDateTime.time)
  writeUint16(view, 12, dosDateTime.date)
  writeUint32(view, 14, crc32)
  writeUint32(view, 18, size)
  writeUint32(view, 22, size)
  writeUint16(view, 26, fileNameBytes.length)
  writeUint16(view, 28, 0)
  header.set(fileNameBytes, 30)
  return header
}

function createCentralHeader(
  fileNameBytes: Uint8Array,
  crc32: number,
  size: number,
  dosDateTime: DosDateTime,
  localHeaderOffset: number
): Uint8Array {
  const header = new Uint8Array(46 + fileNameBytes.length)
  const view = new DataView(header.buffer)
  writeUint32(view, 0, 0x02014b50)
  writeUint16(view, 4, ZIP_VERSION)
  writeUint16(view, 6, ZIP_VERSION)
  writeUint16(view, 8, ZIP_UTF8_FLAG)
  writeUint16(view, 10, ZIP_METHOD_STORE)
  writeUint16(view, 12, dosDateTime.time)
  writeUint16(view, 14, dosDateTime.date)
  writeUint32(view, 16, crc32)
  writeUint32(view, 20, size)
  writeUint32(view, 24, size)
  writeUint16(view, 28, fileNameBytes.length)
  writeUint16(view, 30, 0)
  writeUint16(view, 32, 0)
  writeUint16(view, 34, 0)
  writeUint16(view, 36, 0)
  writeUint32(view, 38, 0)
  writeUint32(view, 42, localHeaderOffset)
  header.set(fileNameBytes, 46)
  return header
}

function createEndOfCentralDirectory(
  entryCount: number,
  centralDirectorySize: number,
  centralDirectoryOffset: number
): Uint8Array {
  const eocd = new Uint8Array(22)
  const view = new DataView(eocd.buffer)
  writeUint32(view, 0, 0x06054b50)
  writeUint16(view, 4, 0)
  writeUint16(view, 6, 0)
  writeUint16(view, 8, entryCount)
  writeUint16(view, 10, entryCount)
  writeUint32(view, 12, centralDirectorySize)
  writeUint32(view, 16, centralDirectoryOffset)
  writeUint16(view, 20, 0)
  return eocd
}

function calcChunksLength(chunks: Uint8Array[]): number {
  return chunks.reduce((total, chunk) => total + chunk.byteLength, 0)
}

// 使用 STORE 模式生成最小可用 Zip，避免引入第三方依赖。
export function createZipBlob(entries: ZipEntry[]): Blob {
  if (!entries.length) {
    throw new Error('Zip 内容不能为空')
  }

  const localChunks: BlobPart[] = []
  const centralChunks: Uint8Array[] = []
  let localOffset = 0

  for (const entry of entries) {
    const fileNameBytes = encodeFileName(entry.fileName)
    const fileData = entry.data
    const dosDateTime = toDosDateTime(entry.lastModified ?? new Date())
    const crc32 = calcCrc32(fileData)
    const fileSize = fileData.byteLength
    const localHeader = createLocalHeader(fileNameBytes, crc32, fileSize, dosDateTime)
    const centralHeader = createCentralHeader(
      fileNameBytes,
      crc32,
      fileSize,
      dosDateTime,
      localOffset
    )

    localChunks.push(localHeader, fileData)
    centralChunks.push(centralHeader)
    localOffset += localHeader.byteLength + fileSize
  }

  const centralDirectorySize = calcChunksLength(centralChunks)
  const eocd = createEndOfCentralDirectory(entries.length, centralDirectorySize, localOffset)

  return new Blob([...localChunks, ...centralChunks, eocd], { type: 'application/zip' })
}
