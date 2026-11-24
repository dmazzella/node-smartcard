---
title: Getting started
---

# Getting started

## Installation

```sh
npm install @node-ctypes/smartcard
```

- **Node.js 24+** and ESM (`"type": "module"` or `.mjs`).
- Powered by [node-ctypes](https://www.npmjs.com/package/node-ctypes) — pure TypeScript, zero C++ compilation.
- Uses the OS PC/SC stack directly:
  - **Windows**: `winscard.dll` (Unicode `W` APIs)
  - **macOS**: `/System/Library/Frameworks/PCSC.framework/PCSC` (1-byte packed structs, `SCardControl132`)
  - **Linux**: `libpcsclite.so.1` with a running `pcscd` service

## Quick start

`@node-ctypes/smartcard` preserves the `node-scard` handle-based API shape while adding native TypeScript declarations and `await using` disposal:

```typescript
import { scard } from "@node-ctypes/smartcard";

await using context = new scard.Context();
const ctx = await context.establish(scard.Scope.User);
const readers = await context.listReaders(ctx);
console.log("Readers:", readers);

// An empty input queries all currently available readers.
const statuses = await context.getStatusChange(ctx, [], 0);
for (const status of statuses) {
  console.log(status.reader, status.state, status.atr.toString("hex"));
}
```

## Entry points

| Subpath                            | Exports                                                                                                                                                         |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@node-ctypes/smartcard`           | `Context`, `Card`, `ATR`, `Monitor`, `Delay`, `SCardError`, `Scope`, `State`, `Share`, `Protocol`, `Disposition`, `Attribute`, `scard` / `smartcard` namespaces |
| `@node-ctypes/smartcard/scard`     | Reference-compatible subpath alias re-exporting `@node-ctypes/smartcard`                                                                                        |
| `@node-ctypes/smartcard/low-level` | `scard` namespace: platform-aware `createTypes()`, `Native`, PC/SC constants, `checkResult()`, `resultCode()`, `SCardError`                                     |

## Building from source

```sh
npm install
npm run build
npm run test:checks
```

See [Building, testing and internals](contributing.md) for mirrored-buffer tests, hardware suites and docs generation.
