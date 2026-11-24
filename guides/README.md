---
title: Guides
children:
  - ./getting-started.md
  - ./context-and-card.md
  - ./monitor-and-atr.md
  - ./low-level.md
  - ./contributing.md
---

# Guides

- [Getting started](getting-started.md) — installation, platform PC/SC libraries, quick start and entry points
- [Contexts, cards and transactions](context-and-card.md) — `Context`, `Card`, APDUs (`transmit`), reader control codes (`control`), attributes and transactions
- [Monitor and ATR parsing](monitor-and-atr.md) — live reader/card monitoring (`Monitor`) and ISO 7816-3 `ATR` decoding
- [Low-level PC/SC API](low-level.md) — `@node-ctypes/smartcard/low-level`, platform ABI differences (`winscard`, `PCSC.framework`, `libpcsclite`) and raw calls
- [Building, testing and internals](contributing.md) — unit, PC/SC system checks, hardware reference tests, mirror mode and `FLOWS.md`

See also [Examples](../examples/README.md) and [FLOWS.md](../FLOWS.md) (detailed internal flows in Italian).
