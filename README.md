# @node-ctypes/smartcard

[![npm version](https://img.shields.io/npm/v/@node-ctypes/smartcard)](https://www.npmjs.com/package/@node-ctypes/smartcard)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docs](https://img.shields.io/badge/docs-TypeDoc-blue)](https://dmazzella.github.io/node-smartcard/)
[![Node.js](https://img.shields.io/badge/node-%3E%3D24-brightgreen)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](guides/low-level.md)

Typed, portable PC/SC smart card bindings and asynchronous high-level API for Node.js, powered by [node-ctypes](https://www.npmjs.com/package/node-ctypes) — pure TypeScript, zero C++ compilation.

## Features

- **Cross-platform native PC/SC** — binds `winscard.dll` (Windows UTF-16LE), `PCSC.framework` (macOS 1-byte packed ABI + `SCardControl132`), and `libpcsclite.so.1` (Linux LP64) directly
- **High-level async API** — `Context`, `Card`, `ATR`, `Monitor`, `Delay`, `SCardError` preserving `node-scard` ergonomics with `await using` disposal
- **Low-level FFI surface** — `@node-ctypes/smartcard/low-level` exposes all 17 core PC/SC functions as `node-ctypes` wrappers (`.callAsync()`, `argtypes`, `restype`, `errcheck`) plus platform-aware `SCARD_READERSTATE` and `SCARD_IO_REQUEST`
- **Safe resource & buffer hygiene** — deterministic card disconnect on context release, immediate `SCardCancel` wakeup on `Monitor.stop()`, and automatic zeroing of APDU/attribute scratch buffers
- **Electron / sandbox ready** — verified under both standard external buffers and `NODE_CTYPES_NO_EXTERNAL_BUFFERS=1` mirror mode

## Installation

```sh
npm install @node-ctypes/smartcard
```

Requires **Node.js 24+** and ESM (`"type": "module"`). See [Getting started](guides/getting-started.md) for OS PC/SC prerequisites.

## Quick start

```typescript
import { scard } from "@node-ctypes/smartcard";

await using context = new scard.Context();
const ctx = await context.establish(scard.Scope.User);
const readers = await context.listReaders(ctx);
console.log("Readers:", readers);

const statuses = await context.getStatusChange(ctx, [], 0);
for (const status of statuses) {
  console.log(status.reader, status.state, status.atr.toString("hex"));
}
```

## Documentation

Full API reference (TypeDoc): **[dmazzella.github.io/node-smartcard](https://dmazzella.github.io/node-smartcard/)**

### Guides

- [Getting started](guides/getting-started.md) — installation, OS PC/SC prerequisites and entry points
- [Contexts, cards and transactions](guides/context-and-card.md) — `Context`, `Card`, APDUs (`transmit`), `control`, attributes and transactions
- [Monitor and ATR parsing](guides/monitor-and-atr.md) — event-driven `Monitor` and ISO 7816-3 `ATR` decoding
- [Low-level PC/SC API](guides/low-level.md) — `@node-ctypes/smartcard/low-level`, platform ABI differences and raw sync/async calls
- [Building, testing and internals](guides/contributing.md) — test suites, mirror mode, hardware tests and [FLOWS.md](FLOWS.md)

### Examples

See [examples/README.md](examples/README.md) for runnable TypeScript examples ([readers.ts](examples/readers.ts), [monitor.ts](examples/monitor.ts)).

## License

[MIT](LICENSE). See [NOTICE](NOTICE) for native API references. OS libraries and reader drivers are not bundled.
