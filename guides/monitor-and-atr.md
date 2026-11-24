---
title: Monitor and ATR parsing
---

# Monitor and ATR parsing

## Monitoring readers and cards (`Monitor`)

`Monitor` watches PC/SC reader connections and card insert/remove/change transitions using a persistent `Context` (re-established automatically on service restart) and immediate `SCardCancel` wakeup on `stop()`:

```typescript
import { Delay, Monitor } from "@node-ctypes/smartcard";

await using monitor = new Monitor();
monitor.on("reader-connected", (reader) => console.log("Connected:", reader));
monitor.on("reader-disconnected", (reader) => console.log("Disconnected:", reader));
monitor.on("card-inserted", (reader, status) => console.log("Card inserted:", reader, status.atr.toString("hex")));
monitor.on("card-removed", (reader) => console.log("Card removed:", reader));
monitor.on("card-changed", (reader, status) => console.log("Card changed:", reader, status.atr.toString("hex")));
monitor.on("error", (error) => console.error(error));

await monitor.start();
await Delay(5_000);
monitor.stop();
```

### Events

| Event                  | Signature                                      | When emitted                                   |
| ---------------------- | ---------------------------------------------- | ---------------------------------------------- |
| `readers-changed`      | `(readers: string[]) => void`                  | Whenever the list of connected readers changes |
| `reader-connected`     | `(readerName: string) => void`                 | A new reader appears                           |
| `reader-disconnected`  | `(readerName: string) => void`                 | A previously known reader disappears           |
| `reader-status-update` | `(readerName: string, status: Status) => void` | Any reader state or ATR change                 |
| `card-inserted`        | `(readerName: string, status: Status) => void` | Card transitions from absent to present        |
| `card-removed`         | `(readerName: string) => void`                 | Card transitions from present to absent        |
| `card-changed`         | `(readerName: string, status: Status) => void` | Card remains present while its ATR changes     |
| `no-readers`           | `() => void`                                   | No PC/SC readers are currently available       |
| `close`                | `() => void`                                   | Emitted once after shutdown finishes           |
| `error`                | `(error: Error) => void`                       | Any recoverable PC/SC error during monitoring  |

`stop()` initiates shutdown synchronously and cancels any active `SCardGetStatusChange` wait; `await using` awaits clean completion of the background loop and `close`.

## Parsing ISO 7816-3 ATRs (`ATR`)

`ATR` parses smart card Answer To Reset byte sequences from a hex string, `Buffer`, or `number[]`:

```typescript
import { ATR } from "@node-ctypes/smartcard";

const atr = new ATR("3B 8F 80 01 80 4F 0C A0 00 00 03 06 03 00 01 00 00 00 00 6A");
console.log(atr.isT0Supported(), atr.isT1Supported(), atr.checksumOK);
console.log(atr.renderObject());
```

- Validates length (`2..33` bytes), initial `TS` (`0x3B` direct / `0x3F` inverse convention), interface byte groups (`TAi`..`TDi`), historical bytes (`K`) and optional/required `TCK` checksum.
- A structurally complete ATR with a bad checksum remains inspectable with `checksumOK: false`.
- `atr.render()` formats a human-readable multi-line report; `atr.renderObject()` returns a typed `AtrRendering` DTO.
