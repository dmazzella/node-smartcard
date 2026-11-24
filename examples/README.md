---
title: Examples
---

# Examples

Safe, read-only runnable TypeScript examples built on `@node-ctypes/smartcard`. Build the package first (`npm run build`), then execute with Node.js 24+:

```sh
npm run build
node examples/readers.ts
node examples/monitor.ts
```

| Example                  | What it demonstrates                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| [readers.ts](readers.ts) | Listing connected PC/SC readers, querying live card status and decoding ISO 7816-3 `ATR`s |
| [monitor.ts](monitor.ts) | Live event-driven reader/card insertion and removal monitoring via `Monitor`              |

For complete API walkthroughs, see [Guides](../guides/README.md).
