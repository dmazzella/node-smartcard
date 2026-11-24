import * as ctypes from "node-ctypes";
import { performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";
import { scard } from "./low-level/index.ts";
import type { Native } from "./low-level/index.ts";
import { capacity, inputBytes, multiString, statusNames, readBuffer, returnedLength, text, uint32 } from "./buffers.ts";
import type { ResourceCardStatus, ConnectOptions, ContextOptions, ReaderEvent, ReaderState, ReconnectOptions, TransmitOptions, WaitOptions } from "./types.ts";

type Handle = InstanceType<typeof scard.SCARDCONTEXT>;
interface Queue {
  tail: Promise<void>;
}
interface ContextState extends Queue {
  native: Native;
  handle: Handle;
  ownsNative: boolean;
  released: boolean;
  closing: Promise<void> | null;
  wait: Promise<void> | null;
  cancelVersion: number;
  cards: Set<Card>;
}
interface CardState extends Queue {
  context: ContextState;
  handle: Handle;
  protocol: number;
  disconnected: boolean;
  disconnecting: Promise<void> | null;
  transaction: boolean;
}
const contexts = new WeakMap<Context, ContextState>();
const cards = new WeakMap<Card, CardState>();
function contextState(context: Context): ContextState {
  const state = contexts.get(context);
  if (!state) throw new TypeError("Expected a smartcard Context");
  return state;
}
function cardState(card: Card): CardState {
  const state = cards.get(card);
  if (!state) throw new TypeError("Expected a smartcard Card");
  return state;
}
function assertContext(state: ContextState): void {
  if (state.released || state.closing) throw new Error("PC/SC context is released or closing");
}
function enqueue<T>(queue: Queue, work: () => Promise<T>): Promise<T> {
  const result = queue.tail.then(work);
  queue.tail = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}
function runContext<T>(state: ContextState, work: () => Promise<T>): Promise<T> {
  assertContext(state);
  return enqueue(state, work);
}
function runCard<T>(state: CardState, work: () => Promise<T>): Promise<T> {
  assertContext(state.context);
  if (state.disconnected || state.disconnecting) throw new Error("PC/SC card is disconnected or disconnecting");
  return enqueue(state, work);
}
function disposition(value: number): number {
  if (![scard.SCARD_LEAVE_CARD, scard.SCARD_RESET_CARD, scard.SCARD_UNPOWER_CARD, scard.SCARD_EJECT_CARD].includes(value)) throw new RangeError("Invalid card disposition");
  return value;
}
function connectionOptions(options: ConnectOptions): [number, number] {
  const share = options.shareMode ?? scard.SCARD_SHARE_SHARED;
  if (![scard.SCARD_SHARE_EXCLUSIVE, scard.SCARD_SHARE_SHARED, scard.SCARD_SHARE_DIRECT].includes(share)) throw new RangeError("Invalid share mode");
  return [share, uint32(options.preferredProtocols ?? (share === scard.SCARD_SHARE_DIRECT ? 0 : scard.SCARD_PROTOCOL_ANY), "preferredProtocols")];
}

export class Context {
  private constructor(state: ContextState) {
    contexts.set(this, state);
  }

  static async establish(options: ContextOptions = {}): Promise<Context> {
    if (options.native && options.libraryPath !== undefined) throw new TypeError("Specify native or libraryPath, not both");
    const scope = options.scope ?? scard.SCARD_SCOPE_USER;
    if (![scard.SCARD_SCOPE_USER, scard.SCARD_SCOPE_TERMINAL, scard.SCARD_SCOPE_SYSTEM].includes(scope)) throw new RangeError("Invalid PC/SC scope");
    const native = options.native ?? new scard.Native({ libraryPath: options.libraryPath });
    const handle = new native.types.SCARDCONTEXT();
    try {
      scard.checkResult(await native.SCardEstablishContext.callAsync(scope, null, null, ctypes.byref(handle)), "SCardEstablishContext");
      return new Context({ native, handle, ownsNative: !options.native, tail: Promise.resolve(), released: false, closing: null, wait: null, cancelVersion: 0, cards: new Set() });
    } catch (error) {
      if (!options.native) native.close();
      throw error;
    }
  }

  get handle(): bigint {
    const state = contextState(this);
    assertContext(state);
    return BigInt(state.handle.value);
  }

  async isValid(): Promise<boolean> {
    const state = contextState(this);
    if (state.released) return false;
    return runContext(state, async () => {
      const rv = await state.native.SCardIsValidContext.callAsync(state.handle.value);
      if (scard.resultCode(rv) === scard.SCARD_E_INVALID_HANDLE) return false;
      scard.checkResult(rv, "SCardIsValidContext");
      return true;
    });
  }

  async listReaders(groups?: readonly string[]): Promise<string[]> {
    const state = contextState(this);
    const windows = state.native.types.platform === "win32";
    if (groups !== undefined && !Array.isArray(groups)) throw new TypeError("groups must be an array of names");
    const encoded = groups?.length ? Buffer.concat([...groups.map((group) => text(group, windows)), Buffer.alloc(windows ? 2 : 1)]) : null;
    if (encoded) capacity(encoded.length);
    return runContext(state, async () =>
      multiString(await readBuffer(state.native, "SCardListReaders", (out, length) => state.native.SCardListReaders.callAsync(state.handle.value, encoded, out, ctypes.byref(length)), windows ? 2 : 1, true), windows),
    );
  }

  async listReaderGroups(): Promise<string[]> {
    const state = contextState(this);
    const windows = state.native.types.platform === "win32";
    return runContext(state, async () => multiString(await readBuffer(state.native, "SCardListReaderGroups", (out, length) => state.native.SCardListReaderGroups.callAsync(state.handle.value, out, ctypes.byref(length)), windows ? 2 : 1), windows));
  }

  async connect(reader: string, options: ConnectOptions = {}): Promise<Card> {
    return Card.connect(this, reader, options);
  }

  async cancel(): Promise<void> {
    const state = contextState(this);
    assertContext(state);
    state.cancelVersion++;
    const operation = state.native.SCardCancel.callAsync(state.handle.value).then((rv) => scard.checkResult(rv, "SCardCancel"));
    const settled = operation.then(
      () => undefined,
      () => undefined,
    );
    state.tail = Promise.all([state.tail, settled]).then(() => undefined);
    await operation;
  }

  async waitForChange(readers: readonly ReaderState[], options: WaitOptions = {}): Promise<ReaderEvent[]> {
    const state = contextState(this);
    assertContext(state);
    if (state.wait) throw new Error("Only one waitForChange is allowed per context");
    if (!Array.isArray(readers) || readers.length === 0 || readers.length > 4096) throw new RangeError("waitForChange requires between 1 and 4096 readers");
    const timeout = uint32(options.timeout ?? scard.INFINITE, "timeout");
    options.signal?.throwIfAborted();
    const { native } = state;
    const cancelVersion = state.cancelVersion;
    const inputs = readers.map((reader) => ({ reader: reader.reader, currentState: uint32(reader.currentState ?? scard.SCARD_STATE_UNAWARE, "currentState") }));
    const encoded = inputs.map((reader) => text(reader.reader, native.types.platform === "win32"));
    const stride = ctypes.sizeof(native.types.SCARD_READERSTATE);
    const array = Buffer.alloc(capacity(stride * inputs.length));
    const rows = inputs.map((reader, index) => {
      const row = native.types.SCARD_READERSTATE.from_buffer(array, stride * index);
      row.szReader = ctypes.cast(encoded[index], native.types.LPTSTR);
      row.dwCurrentState = reader.currentState;
      return row;
    });
    const operation = (async () => {
      const started = performance.now();
      for (;;) {
        assertContext(state);
        if (state.cancelVersion !== cancelVersion) throw new scard.SCardError(scard.SCARD_E_CANCELLED, "SCardGetStatusChange");
        options.signal?.throwIfAborted();
        const remaining = timeout === scard.INFINITE ? 100 : Math.max(0, timeout - (performance.now() - started));
        const slice = Math.min(100, Math.ceil(remaining));
        const rv = await native.SCardGetStatusChange.callAsync(state.handle.value, slice, array, rows.length);
        assertContext(state);
        if (state.cancelVersion !== cancelVersion) throw new scard.SCardError(scard.SCARD_E_CANCELLED, "SCardGetStatusChange");
        options.signal?.throwIfAborted();
        if (scard.resultCode(rv) === scard.SCARD_S_SUCCESS) {
          return rows.map((row, index) => ({
            reader: inputs[index].reader,
            currentState: inputs[index].currentState,
            eventState: uint32(Number(row.dwEventState), "eventState"),
            atr: Buffer.from(Buffer.from(row.rgbAtr).subarray(0, returnedLength(row.cbAtr, scard.MAX_ATR_SIZE, "SCardGetStatusChange"))),
          }));
        }
        if (scard.resultCode(rv) !== scard.SCARD_E_TIMEOUT) scard.checkResult(rv, "SCardGetStatusChange");
        if (timeout !== scard.INFINITE && performance.now() - started >= timeout) throw new scard.SCardError(scard.SCARD_E_TIMEOUT, "SCardGetStatusChange");
        await delay(1);
      }
    })().finally(() => {
      // Pin encoded reader name buffers across every native SCardGetStatusChange call.
      void encoded;
    });
    const settled = operation.then(
      () => undefined,
      () => undefined,
    );
    state.wait = settled;
    try {
      return await operation;
    } finally {
      if (state.wait === settled) state.wait = null;
    }
  }

  async release(): Promise<void> {
    const state = contextState(this);
    if (state.closing) return state.closing;
    if (state.released) {
      if (state.ownsNative) state.native.close();
      return;
    }
    const closing = Promise.resolve().then(async () => {
      await state.tail;
      if (state.wait) await state.wait;
      const results = await Promise.allSettled([...state.cards].reverse().map((card) => card.disconnect()));
      const errors: unknown[] = [];
      for (const result of results) if (result.status === "rejected") errors.push(result.reason);
      if (errors.length) throw new AggregateError(errors, "Failed to disconnect cards; context remains owned for retry");
      scard.checkResult(await state.native.SCardReleaseContext.callAsync(state.handle.value), "SCardReleaseContext");
      state.released = true;
      if (state.ownsNative) state.native.close();
    });
    state.closing = closing;
    try {
      await closing;
    } finally {
      state.closing = null;
    }
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.release();
  }
}

export class Card {
  private constructor(state: CardState) {
    cards.set(this, state);
  }

  static async connect(context: Context, reader: string, options: ConnectOptions = {}): Promise<Card> {
    const state = contextState(context);
    const name = text(reader, state.native.types.platform === "win32");
    const [share, preferred] = connectionOptions(options);
    return runContext(state, async () => {
      const handle = new state.native.types.SCARDHANDLE();
      const protocol = new state.native.types.DWORD();
      scard.checkResult(await state.native.SCardConnect.callAsync(state.handle.value, name, share, preferred, ctypes.byref(handle), ctypes.byref(protocol)), "SCardConnect");
      const card = new Card({ context: state, handle, protocol: Number(protocol.value), tail: Promise.resolve(), disconnected: false, disconnecting: null, transaction: false });
      state.cards.add(card);
      return card;
    });
  }

  get handle(): bigint {
    const state = cardState(this);
    assertContext(state.context);
    if (state.disconnected || state.disconnecting) throw new Error("PC/SC card is disconnected or disconnecting");
    return BigInt(state.handle.value);
  }
  get protocol(): number {
    this.handle;
    return cardState(this).protocol;
  }

  async reconnect(options: ReconnectOptions = {}): Promise<void> {
    const state = cardState(this);
    const [share, preferred] = connectionOptions(options);
    const initialization = disposition(options.initialization ?? scard.SCARD_LEAVE_CARD);
    return runCard(state, async () => {
      const protocol = new state.context.native.types.DWORD();
      scard.checkResult(await state.context.native.SCardReconnect.callAsync(state.handle.value, share, preferred, initialization, ctypes.byref(protocol)), "SCardReconnect");
      state.protocol = Number(protocol.value);
      if (state.context.native.types.platform === "win32") state.transaction = false;
    });
  }

  async status(): Promise<ResourceCardStatus> {
    const state = cardState(this);
    return runCard(state, async () => {
      const { native } = state.context;
      const unit = native.types.platform === "win32" ? 2 : 1;
      const nameLength = new native.types.DWORD();
      const atrLength = new native.types.DWORD();
      const cardStateVal = new native.types.DWORD();
      const protocol = new native.types.DWORD();
      const nameLenRef = ctypes.byref(nameLength);
      const atrLenRef = ctypes.byref(atrLength);
      const stateRef = ctypes.byref(cardStateVal);
      const protoRef = ctypes.byref(protocol);
      let rv = await native.SCardStatus.callAsync(state.handle.value, null, nameLenRef, stateRef, protoRef, null, atrLenRef);
      if (scard.resultCode(rv) !== scard.SCARD_E_INSUFFICIENT_BUFFER) scard.checkResult(rv, "SCardStatus");
      for (let attempt = 0; attempt < 4; attempt++) {
        const names = Buffer.allocUnsafe(capacity(Number(nameLength.value) * unit));
        const atr = Buffer.allocUnsafe(capacity(Number(atrLength.value)));
        rv = await native.SCardStatus.callAsync(state.handle.value, names, nameLenRef, stateRef, protoRef, atr, atrLenRef);
        if (scard.resultCode(rv) === scard.SCARD_E_INSUFFICIENT_BUFFER) continue;
        scard.checkResult(rv, "SCardStatus");
        state.protocol = Number(protocol.value);
        return {
          readers: statusNames(names.subarray(0, returnedLength(nameLength.value, names.length / unit, "SCardStatus") * unit), unit === 2),
          state: Number(cardStateVal.value),
          protocol: state.protocol,
          atr: Buffer.from(atr.subarray(0, returnedLength(atrLength.value, atr.length, "SCardStatus"))),
        };
      }
      throw new scard.SCardError(scard.SCARD_E_INSUFFICIENT_BUFFER, "SCardStatus");
    });
  }

  async getAttribute(attribute: number): Promise<Buffer> {
    const state = cardState(this);
    uint32(attribute, "attribute");
    return runCard(state, () => readBuffer(state.context.native, "SCardGetAttrib", (out, length) => state.context.native.SCardGetAttrib.callAsync(state.handle.value, attribute, out, ctypes.byref(length))));
  }
  async getATR(): Promise<Buffer> {
    return this.getAttribute(scard.SCARD_ATTR_ATR_STRING);
  }

  async setAttribute(attribute: number, value: Buffer): Promise<void> {
    const state = cardState(this);
    uint32(attribute, "attribute");
    const bytes = inputBytes(value, "attribute");
    return runCard(state, async () => {
      scard.checkResult(await state.context.native.SCardSetAttrib.callAsync(state.handle.value, attribute, bytes, bytes.length), "SCardSetAttrib");
    }).finally(() => bytes.fill(0));
  }

  async transmit(command: Buffer, preferredProtocol: number, options: TransmitOptions = {}): Promise<Buffer> {
    const state = cardState(this);
    const bytes = inputBytes(command, "command");
    if (!bytes.length) throw new RangeError("command must not be empty");
    const size = capacity(options.responseCapacity ?? 65538, "responseCapacity");
    if (!size) throw new RangeError("responseCapacity must be positive");
    return runCard(state, async () => {
      const { native } = state.context;
      const pci = preferredProtocol === scard.SCARD_PROTOCOL_T0 ? native.SCARD_PCI_T0 : preferredProtocol === scard.SCARD_PROTOCOL_T1 ? native.SCARD_PCI_T1 : preferredProtocol === scard.SCARD_PROTOCOL_RAW ? native.SCARD_PCI_RAW : null;
      if (!pci) throw new TypeError("Card has no supported negotiated protocol; use control() for direct connections");
      const out = Buffer.allocUnsafe(size);
      const length = new native.types.DWORD(size);
      let returnedOut = false;
      try {
        scard.checkResult(await native.SCardTransmit.callAsync(state.handle.value, ctypes.byref(pci), bytes, bytes.length, null, out, ctypes.byref(length)), "SCardTransmit");
        const actual = returnedLength(length.value, size, "SCardTransmit");
        if (actual === 0) return Buffer.alloc(0);
        if (actual === size) {
          returnedOut = true;
          return out;
        }
        return Buffer.from(out.subarray(0, actual));
      } finally {
        if (!returnedOut) out.fill(0);
      }
    }).finally(() => bytes.fill(0));
  }

  async control(code: number, data: Buffer, responseCapacity = 4096): Promise<Buffer> {
    const state = cardState(this);
    uint32(code, "control code");
    const bytes = inputBytes(data, "control data");
    const size = capacity(responseCapacity, "responseCapacity");
    return runCard(state, async () => {
      const out = size > 0 ? Buffer.allocUnsafe(size) : Buffer.alloc(0);
      const length = new state.context.native.types.DWORD();
      let returnedOut = false;
      try {
        scard.checkResult(await state.context.native.SCardControl.callAsync(state.handle.value, code, bytes, bytes.length, out, size, ctypes.byref(length)), "SCardControl");
        const actual = returnedLength(length.value, size, "SCardControl");
        if (actual === 0) return Buffer.alloc(0);
        if (actual === size) {
          returnedOut = true;
          return out;
        }
        return Buffer.from(out.subarray(0, actual));
      } finally {
        if (size > 0 && !returnedOut) out.fill(0);
      }
    }).finally(() => bytes.fill(0));
  }

  async beginTransaction(): Promise<void> {
    const state = cardState(this);
    return runCard(state, async () => {
      if (state.transaction) throw new Error("Card already has an active transaction");
      scard.checkResult(await state.context.native.SCardBeginTransaction.callAsync(state.handle.value), "SCardBeginTransaction");
      state.transaction = true;
    });
  }
  async endTransaction(action = scard.SCARD_LEAVE_CARD): Promise<void> {
    const state = cardState(this);
    disposition(action);
    return runCard(state, async () => {
      if (!state.transaction) throw new Error("Card has no active transaction");
      scard.checkResult(await state.context.native.SCardEndTransaction.callAsync(state.handle.value, action), "SCardEndTransaction");
      state.transaction = false;
    });
  }

  async disconnect(action = scard.SCARD_LEAVE_CARD): Promise<void> {
    const state = cardState(this);
    disposition(action);
    if (state.disconnecting) return state.disconnecting;
    if (state.disconnected) return;
    const disconnecting = enqueue(state, async () => {
      scard.checkResult(await state.context.native.SCardDisconnect.callAsync(state.handle.value, action), "SCardDisconnect");
      state.disconnected = true;
      state.transaction = false;
      state.context.cards.delete(this);
    });
    state.disconnecting = disconnecting;
    try {
      await disconnecting;
    } finally {
      state.disconnecting = null;
    }
  }
  async [Symbol.asyncDispose](): Promise<void> {
    await this.disconnect();
  }
}
