import { scard, Context, Card, Monitor, Delay } from "@node-ctypes/smartcard";
import type { Status, CardStatus, Scard } from "@node-ctypes/smartcard/scard";
import { scard as native } from "@node-ctypes/smartcard/low-level";
import * as ctypes from "node-ctypes";

const namespace: Scard = scard;
const context: Context = new namespace.Context();
const established: Promise<bigint> = context.establish(scard.Scope.User);
const readers: Promise<string[]> = context.listReaders(1n);
const statuses: Promise<Status[]> = context.getStatusChange(1n, [], 0);
context.getStatusChange(1n, [0], 100);
context.getStatusChange(1n, ["Reader"], 100);
context.getStatusChange(1n, [{ reader: "Reader", state: { name: "Present", value: 32 }, atr: Buffer.alloc(0) }], 100);
const card: Card = new scard.Card();
const connected: Promise<bigint> = card.connect(1n, "Reader", scard.Share.Shared, scard.Protocol.Tx);
const reconnected: Promise<bigint> = card.reconnect(1n, scard.Share.Shared, scard.Protocol.Tx, scard.Disposition.LeaveCard);
const status: Promise<CardStatus> = card.status(1n);
const response: Promise<Buffer> = card.transmit(1n, Buffer.alloc(4), scard.Protocol.T1);
const attribute: Promise<Buffer | string | number> = card.getAttribute(1n, scard.Attribute.AtrString);
const monitor: Monitor = new scard.Monitor();
monitor.on("card-inserted", (reader, state) => {
  const name: string = reader;
  const value: Status = state;
  void [name, value];
});
const buffer = new native.SCARDCONTEXT();
using library = new native.Native();
const rv: number | bigint = library.SCardEstablishContext(native.SCARD_SCOPE_USER, null, null, ctypes.byref(buffer));
const pending: Promise<number | bigint> = library.SCardReleaseContext.callAsync(buffer.value);
const signature: ctypes.FFIType[] | null = library.SCardEstablishContext.argtypes;
const restype: ctypes.FFIType | null = library.SCardEstablishContext.restype;
if (library.SCardFreeMemory !== null) {
  const freed: Promise<number | bigint> = library.SCardFreeMemory.callAsync(buffer.value, null);
  void freed;
}
const wait: Promise<void> = Delay(1);
// @ts-expect-error SCardFreeMemory is unavailable on macOS and requires a guard.
library.SCardFreeMemory(buffer.value, null);
// @ts-expect-error Context handles must be bigint.
context.listReaders(1);
// @ts-expect-error Card.connect retains the reference argument order.
card.connect("Reader", 1n, scard.Share.Shared, scard.Protocol.Tx);
// @ts-expect-error State.value is a number, not bigint.
context.getStatusChange(1n, [{ reader: "Reader", state: { name: "", value: 32n }, atr: Buffer.alloc(0) }], 0);
// @ts-expect-error Monitor events are typed.
monitor.on("card-inserted", (reader: number) => {});
void [established, readers, statuses, connected, reconnected, status, response, attribute, rv, pending, signature, restype, wait];
