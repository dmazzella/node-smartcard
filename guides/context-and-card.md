---
title: Contexts, cards and transactions
---

# Contexts, cards and transactions

## Establishing a context and querying readers

```typescript
import { scard } from "@node-ctypes/smartcard";

await using context = new scard.Context();
const ctx = await context.establish(scard.Scope.User);
const reader = process.env.SMARTCARD_READER;
if (!reader || !(await context.listReaders(ctx)).includes(reader)) {
  throw new Error("Set SMARTCARD_READER to the intended reader's exact name");
}

const statuses = await context.getStatusChange(ctx, [reader], 0);
console.log(statuses[0].state, statuses[0].atr.toString("hex"));
```

- `context.getStatusChange(ctx, readers, timeoutMs)` accepts reader indices (`number[]`), reader names (`string[]`), previous `Status[]` snapshots, or `[]` (all currently connected readers).
- `timeoutMs` is in milliseconds (`0xffffffff` = `INFINITE`). Timeouts and `context.cancel(ctx)` reject with `SCardError` (`SCARD_E_TIMEOUT` / `SCARD_E_CANCELLED`).
- Releasing a `Context` (`await context.release(ctx)` or `await using`) disconnects all outstanding managed `Card` handles belonging to that context first; cleanup errors propagate and retain ownership for retry.

## Connecting to a card and sending APDUs

```typescript
const card = new scard.Card();
const handle = await card.connect(ctx, reader, scard.Share.Shared, scard.Protocol.Tx);
try {
  const status = await card.status(handle);
  console.log(status.reader, status.activeProtocol, status.atr.toString("hex"));

  // Send a raw APDU (e.g. GET CHALLENGE on an authorized test card)
  const response = await card.transmit(handle, Buffer.from([0x00, 0x84, 0x00, 0x00, 0x20]), status.activeProtocol.value);
  console.log("Response:", response.toString("hex"));
} finally {
  await card.disconnect(handle, scard.Disposition.LeaveCard);
}
```

- `card.transmit(handle, command, activeProtocol)` sends the raw APDU and returns the full response including trailing `SW1 SW2` status words (reserves 65,538 bytes by default; never replays commands automatically).
- Both temporary command copies (which may carry PIN-verification APDUs) and internal response scratch buffers are wiped (`Buffer.fill(0)`) in `finally`.
- Send only commands authorized for your test card: even seemingly benign APDUs can mutate card state or decrement PIN retry counters.

## Attributes, control codes and transactions

- `card.getAttribute(handle, Attribute.AtrString)` / `card.setAttribute(handle, attr, buffer)` read and write reader/card attributes.
- `card.control(handle, controlCode, data, responseCapacity?)` sends direct reader control commands (e.g. PC/SC v2 PIN-pad feature queries or `FEATURE_VERIFY_PIN_DIRECT`). On macOS this automatically binds Apple's 7-argument `SCardControl132`.
- `card.beginTransaction(handle)` / `card.endTransaction(handle, Disposition.LeaveCard)` bracket exclusive card transactions — always close transactions in `finally`.
- `card.reconnect(handle, shareMode, preferredProtocol, disposition)` resets or renegotiates the protocol on an open connection.
