import * as ctypes from "node-ctypes";
import { types } from "./types.ts";
import type { SmartCardTypes } from "./types.ts";

export interface NativeOptions {
  libraryPath?: string;
  types?: SmartCardTypes;
  errcheck?: ctypes.ErrcheckCallback | null;
}
export type PcscFunction<A extends readonly ctypes.FFIType[]> = ctypes.TypedFFIFunction<A, SmartCardTypes["LONG"]> & {
  argtypes: ctypes.FFIType[] | null;
  restype: ctypes.FFIType | null;
};

export function defaultLibraryPath(): string {
  switch (types.platform) {
    case "win32":
      return "winscard.dll";
    case "darwin":
      return "/System/Library/Frameworks/PCSC.framework/PCSC";
    case "linux":
      return "libpcsclite.so.1";
  }
}

function bind(library: ctypes.CDLL, t: SmartCardTypes) {
  const text = (name: string) => (t.platform === "win32" ? `${name}W` : name);
  const func = <const A extends readonly ctypes.FFIType[]>(name: string, args: A): PcscFunction<A> => {
    const fn: ctypes.FunctionWrapper = library[name];
    fn.argtypes = [...args];
    fn.restype = t.LONG;
    if (fn.address === 0n) throw new Error(`Missing PC/SC export: ${name}`);
    // Narrow the dynamic ctypes wrapper to the signature just assigned.
    return Object.assign(fn, { funcName: name }) as PcscFunction<A>;
  };
  return {
    SCardEstablishContext: func("SCardEstablishContext", [t.DWORD, ctypes.c_void_p, ctypes.c_void_p, t.LPSCARDCONTEXT]),
    SCardReleaseContext: func("SCardReleaseContext", [t.SCARDCONTEXT]),
    SCardIsValidContext: func("SCardIsValidContext", [t.SCARDCONTEXT]),
    SCardListReaders: func(text("SCardListReaders"), [t.SCARDCONTEXT, t.LPTSTR, t.LPTSTR, t.LPDWORD]),
    SCardListReaderGroups: func(text("SCardListReaderGroups"), [t.SCARDCONTEXT, t.LPTSTR, t.LPDWORD]),
    SCardConnect: func(text("SCardConnect"), [t.SCARDCONTEXT, t.LPTSTR, t.DWORD, t.DWORD, t.LPSCARDHANDLE, t.LPDWORD]),
    SCardReconnect: func("SCardReconnect", [t.SCARDHANDLE, t.DWORD, t.DWORD, t.DWORD, t.LPDWORD]),
    SCardDisconnect: func("SCardDisconnect", [t.SCARDHANDLE, t.DWORD]),
    SCardBeginTransaction: func("SCardBeginTransaction", [t.SCARDHANDLE]),
    SCardEndTransaction: func("SCardEndTransaction", [t.SCARDHANDLE, t.DWORD]),
    SCardStatus: func(text("SCardStatus"), [t.SCARDHANDLE, t.LPTSTR, t.LPDWORD, t.LPDWORD, t.LPDWORD, t.LPBYTE, t.LPDWORD]),
    SCardGetStatusChange: func(text("SCardGetStatusChange"), [t.SCARDCONTEXT, t.DWORD, t.LPSCARD_READERSTATE, t.DWORD]),
    SCardCancel: func("SCardCancel", [t.SCARDCONTEXT]),
    SCardTransmit: func("SCardTransmit", [t.SCARDHANDLE, t.LPSCARD_IO_REQUEST, t.LPBYTE, t.DWORD, t.LPSCARD_IO_REQUEST, t.LPBYTE, t.LPDWORD]),
    SCardControl: func(t.platform === "darwin" ? "SCardControl132" : "SCardControl", [t.SCARDHANDLE, t.DWORD, ctypes.c_void_p, t.DWORD, ctypes.c_void_p, t.DWORD, t.LPDWORD]),
    SCardGetAttrib: func("SCardGetAttrib", [t.SCARDHANDLE, t.DWORD, t.LPBYTE, t.LPDWORD]),
    SCardSetAttrib: func("SCardSetAttrib", [t.SCARDHANDLE, t.DWORD, t.LPBYTE, t.DWORD]),
    SCardFreeMemory: t.platform === "darwin" ? null : func("SCardFreeMemory", [t.SCARDCONTEXT, ctypes.c_void_p]),
  };
}

type Functions = ReturnType<typeof bind>;
export interface Native extends Functions {}

export class Native {
  readonly library: ctypes.CDLL;
  readonly types: SmartCardTypes;
  readonly SCARD_PCI_T0: InstanceType<SmartCardTypes["SCARD_IO_REQUEST"]>;
  readonly SCARD_PCI_T1: InstanceType<SmartCardTypes["SCARD_IO_REQUEST"]>;
  readonly SCARD_PCI_RAW: InstanceType<SmartCardTypes["SCARD_IO_REQUEST"]>;
  #closed = false;

  constructor(options: NativeOptions = {}) {
    this.types = options.types ?? types;
    if (this.types.platform !== types.platform) throw new TypeError("Native calls require the host platform ABI");
    const Library = this.types.platform === "win32" ? ctypes.WinDLL : ctypes.CDLL;
    this.library = new Library(options.libraryPath ?? defaultLibraryPath());
    try {
      const functions = bind(this.library, this.types);
      if (options.errcheck !== undefined) for (const fn of Object.values(functions)) if (fn !== null) fn.errcheck = options.errcheck;
      Object.assign(this, functions);
      this.SCARD_PCI_T0 = this.types.SCARD_IO_REQUEST.in_dll(this.library, "g_rgSCardT0Pci");
      this.SCARD_PCI_T1 = this.types.SCARD_IO_REQUEST.in_dll(this.library, "g_rgSCardT1Pci");
      this.SCARD_PCI_RAW = this.types.SCARD_IO_REQUEST.in_dll(this.library, "g_rgSCardRawPci");
    } catch (error) {
      this.library.close();
      throw error;
    }
  }

  get closed(): boolean {
    return this.#closed;
  }
  close(): void {
    if (this.#closed) return;
    this.library.close();
    this.#closed = true;
  }
  [Symbol.dispose](): void {
    this.close();
  }
}
