import { TextDecoder } from "node:util";
import { scard } from "./low-level/index.ts";
import type { Native } from "./low-level/index.ts";

const UTF16_DECODER = new TextDecoder("utf-16le", { fatal: true });
const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });

export const MAX_BUFFER_SIZE = 16 * 1024 * 1024;
export function uint32(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new RangeError(`${name} must be an unsigned 32-bit integer`);
  return value;
}
export function capacity(value: number, name = "buffer capacity"): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_BUFFER_SIZE) throw new RangeError(`${name} must be between 0 and ${MAX_BUFFER_SIZE}`);
  return value;
}
export function returnedLength(value: number | bigint, available: number, name: string): number {
  const length = Number(value);
  if (!Number.isSafeInteger(length) || length < 0 || length > available) throw new RangeError(`${name} returned invalid length ${value} (capacity ${available})`);
  return length;
}
export function inputBytes(value: Buffer, name: string): Buffer {
  if (!Buffer.isBuffer(value)) throw new TypeError(`${name} must be a Buffer`);
  capacity(value.length, name);
  return Buffer.from(value);
}
export function text(value: string, windows: boolean): Buffer {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) throw new TypeError("PC/SC names must be nonempty strings without NUL");
  const encoded = Buffer.from(value + "\0", windows ? "utf16le" : "utf8");
  const decoded = (windows ? UTF16_DECODER : UTF8_DECODER).decode(encoded);
  if (decoded !== value + "\0") throw new TypeError("PC/SC names must contain valid Unicode");
  capacity(encoded.length);
  return encoded;
}
export function multiString(buffer: Buffer, windows: boolean): string[] {
  if (buffer.length === 0) return [];
  const value = (windows ? UTF16_DECODER : UTF8_DECODER).decode(buffer);
  if (!value.endsWith("\0\0")) throw new TypeError("PC/SC returned an unterminated multi-string");
  return value
    .slice(0, -2)
    .split("\0")
    .filter((entry) => entry.length > 0);
}
export function statusNames(buffer: Buffer, windows: boolean): string[] {
  const value = (windows ? UTF16_DECODER : UTF8_DECODER).decode(buffer);
  if (!value.endsWith("\0")) throw new TypeError("SCardStatus returned an unterminated reader name");
  const names = value.replace(/\0+$/, "").split("\0");
  if (names.some((name) => name.length === 0)) throw new TypeError("SCardStatus returned an empty reader name");
  return names;
}
export async function readBuffer(native: Native, name: string, invoke: (buffer: Buffer | null, length: InstanceType<typeof scard.DWORD>) => Promise<number | bigint>, unit = 1, noReaders = false): Promise<Buffer> {
  const length = new native.types.DWORD(0);
  let rv = await invoke(null, length);
  if (noReaders && scard.resultCode(rv) === scard.SCARD_E_NO_READERS_AVAILABLE) return Buffer.alloc(0);
  if (scard.resultCode(rv) !== scard.SCARD_E_INSUFFICIENT_BUFFER) scard.checkResult(rv, name);
  for (let attempt = 0; attempt < 4; attempt++) {
    const bytes = capacity(Number(length.value) * unit, `${name} output`);
    if (bytes === 0) {
      scard.checkResult(rv, name);
      return Buffer.alloc(0);
    }
    const buffer = Buffer.allocUnsafe(bytes);
    try {
      rv = await invoke(buffer, length);
    } catch (error) {
      buffer.fill(0);
      throw error;
    }
    if (noReaders && scard.resultCode(rv) === scard.SCARD_E_NO_READERS_AVAILABLE) {
      buffer.fill(0);
      return Buffer.alloc(0);
    }
    if (scard.resultCode(rv) === scard.SCARD_E_INSUFFICIENT_BUFFER) {
      buffer.fill(0);
      continue;
    }
    try {
      scard.checkResult(rv, name);
      const actualBytes = returnedLength(length.value, bytes / unit, name) * unit;
      if (actualBytes === 0) {
        buffer.fill(0);
        return Buffer.alloc(0);
      }
      if (actualBytes === bytes) return buffer;
      const out = Buffer.from(buffer.subarray(0, actualBytes));
      buffer.fill(0);
      return out;
    } catch (error) {
      buffer.fill(0);
      throw error;
    }
  }
  throw new scard.SCardError(scard.SCARD_E_INSUFFICIENT_BUFFER, name);
}
