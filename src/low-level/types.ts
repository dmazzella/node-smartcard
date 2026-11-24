import * as ctypes from "node-ctypes";
import { currentPlatform, platformConstants } from "./constants.ts";
import type { Platform } from "./constants.ts";

export function createTypes(platform: Platform = currentPlatform()) {
  if (!["win32", "darwin", "linux"].includes(platform)) throw new TypeError(`Unsupported PC/SC platform: ${platform}`);
  const DWORD = platform === "linux" ? ctypes.c_ulong : ctypes.c_uint32;
  const LONG = platform === "linux" ? ctypes.c_long : ctypes.c_int32;
  const SCARDCONTEXT = platform === "win32" ? ctypes.c_size_t : LONG;
  const SCARDHANDLE = SCARDCONTEXT;
  const BYTE = ctypes.c_ubyte;
  const TCHAR = platform === "win32" ? ctypes.c_uint16 : ctypes.c_char;
  const { MAX_ATR_SIZE } = platformConstants(platform);
  class SCARD_READERSTATE extends ctypes.Structure {
    static _pack_ = platform === "darwin" ? 1 : null;
    static _fields_ = [
      ["szReader", ctypes.POINTER(TCHAR)],
      ["pvUserData", ctypes.c_void_p],
      ["dwCurrentState", DWORD],
      ["dwEventState", DWORD],
      ["cbAtr", DWORD],
      ["rgbAtr", ctypes.array(BYTE, MAX_ATR_SIZE)],
    ] as const;
    declare szReader: ctypes.PointerInstance<unknown>;
    declare pvUserData: bigint | null;
    declare dwCurrentState: number | bigint;
    declare dwEventState: number | bigint;
    declare cbAtr: number | bigint;
    declare rgbAtr: ctypes.ArrayInstance<number>;
  }
  class SCARD_IO_REQUEST extends ctypes.Structure {
    static _pack_ = platform === "darwin" ? 1 : null;
    static _fields_ = [
      ["dwProtocol", DWORD],
      ["cbPciLength", DWORD],
    ] as const;
    declare dwProtocol: number | bigint;
    declare cbPciLength: number | bigint;
  }
  return Object.freeze({
    platform,
    DWORD,
    LONG,
    BYTE,
    TCHAR,
    SCARDCONTEXT,
    SCARDHANDLE,
    SCARD_READERSTATE,
    SCARD_IO_REQUEST,
    LPDWORD: ctypes.POINTER(DWORD),
    LPBYTE: ctypes.POINTER(BYTE),
    LPTSTR: ctypes.POINTER(TCHAR),
    LPSCARDCONTEXT: ctypes.POINTER(SCARDCONTEXT),
    LPSCARDHANDLE: ctypes.POINTER(SCARDHANDLE),
    LPSCARD_READERSTATE: ctypes.POINTER(SCARD_READERSTATE),
    LPSCARD_IO_REQUEST: ctypes.POINTER(SCARD_IO_REQUEST),
    SCARD_AUTOALLOCATE: (1n << BigInt(ctypes.sizeof(DWORD) * 8)) - 1n,
  });
}

export type SmartCardTypes = ReturnType<typeof createTypes>;
export const types = createTypes();
export const { DWORD, LONG, BYTE, TCHAR, SCARDCONTEXT, SCARDHANDLE, SCARD_READERSTATE, SCARD_IO_REQUEST, LPDWORD, LPBYTE, LPTSTR, LPSCARDCONTEXT, LPSCARDHANDLE, LPSCARD_READERSTATE, LPSCARD_IO_REQUEST, SCARD_AUTOALLOCATE } = types;
