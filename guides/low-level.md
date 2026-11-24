---
title: Low-level PC/SC API
---

# Low-level PC/SC API

Import `scard` from `@node-ctypes/smartcard/low-level` for direct access to native PC/SC functions, platform-specific ctypes structures (`SCARD_READERSTATE`, `SCARD_IO_REQUEST`, `SCARDCONTEXT`, `SCARDHANDLE`, `DWORD`, `LONG`), constants, `checkResult()` and `SCardError`.

## Asynchronous calls (`callAsync`)

```javascript
import * as ctypes from "node-ctypes";
import { scard } from "@node-ctypes/smartcard/low-level";

using native = new scard.Native();
const ctx = new scard.SCARDCONTEXT();
scard.checkResult(await native.SCardEstablishContext.callAsync(scard.SCARD_SCOPE_USER, null, null, ctypes.byref(ctx)), "SCardEstablishContext");
try {
  scard.checkResult(await native.SCardIsValidContext.callAsync(ctx.value), "SCardIsValidContext");
} finally {
  scard.checkResult(await native.SCardReleaseContext.callAsync(ctx.value), "SCardReleaseContext");
}
```

## Synchronous calls

```javascript
import * as ctypes from "node-ctypes";
import { scard } from "@node-ctypes/smartcard/low-level";

using native = new scard.Native();
const ctx = new scard.SCARDCONTEXT();
scard.checkResult(native.SCardEstablishContext(scard.SCARD_SCOPE_USER, null, null, ctypes.byref(ctx)), "SCardEstablishContext");
try {
  scard.checkResult(native.SCardIsValidContext(ctx.value), "SCardIsValidContext");
} finally {
  scard.checkResult(native.SCardReleaseContext(ctx.value), "SCardReleaseContext");
}
```

## Platform ABI differences

`scard.createTypes(platform)` models each OS's exact PC/SC ABI:

| Aspect            | Windows (`win32`)        | macOS (`darwin`)                                 | Linux (`linux`)                       |
| ----------------- | ------------------------ | ------------------------------------------------ | ------------------------------------- |
| Shared library    | `winscard.dll`           | `/System/Library/Frameworks/PCSC.framework/PCSC` | `libpcsclite.so.1`                    |
| `DWORD` / `LONG`  | `uint32` / `int32`       | `uint32` / `int32`                               | `c_ulong` / `c_long` (64-bit on LP64) |
| `SCARDCONTEXT`    | `size_t` (pointer-sized) | `int32`                                          | `c_long`                              |
| Text encoding     | UTF-16LE (`*W` exports)  | UTF-8                                            | UTF-8                                 |
| Struct packing    | Natural                  | `1`-byte packed (`_pack_ = 1`)                   | Natural                               |
| `SCardControl`    | `SCardControl`           | `SCardControl132` (7-argument canonical)         | `SCardControl`                        |
| `SCardFreeMemory` | Exported                 | `null` (not exported by `PCSC.framework`)        | Exported                              |

- All 17 core PC/SC functions are bound as full `node-ctypes` wrappers (supporting `.callAsync()`, `errcheck`, `argtypes`, `restype`), plus `SCARD_PCI_T0`, `SCARD_PCI_T1`, `SCARD_PCI_RAW` loaded via `SCARD_IO_REQUEST.in_dll()`.
- Always guard `native.SCardFreeMemory` before calling it and avoid `SCARD_AUTOALLOCATE` in portable code.
- Pass `{ libraryPath }` to `new scard.Native({ libraryPath })` to load an explicit library path.
- Never mix low-level `SCardReleaseContext`/`SCardDisconnect` calls with high-level managed `Context`/`Card` handles.
