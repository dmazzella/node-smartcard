import { Context as ResourceContext, Card as ResourceCard } from "./resources.ts";
import { scard } from "./low-level/index.ts";
import { uint32 } from "./buffers.ts";
import { protocolName, stateName, Disposition } from "./constants.ts";
import type { Status, CardStatus } from "./types.ts";

interface ContextEntry {
  resource: ResourceContext;
  remove: () => void;
}
const contexts = new Map<bigint, ContextEntry>();
const cards = new Map<bigint, { resource: ResourceCard; context: bigint }>();
function contextEntry(handle: bigint): ContextEntry {
  if (typeof handle !== "bigint") throw new TypeError("Expected a BigInt context handle");
  const entry = contexts.get(handle);
  if (!entry) throw new scard.SCardError(scard.SCARD_E_INVALID_HANDLE, "Context");
  return entry;
}
function cardEntry(handle: bigint) {
  if (typeof handle !== "bigint") throw new TypeError("Expected a BigInt card handle");
  const entry = cards.get(handle);
  if (!entry) throw new scard.SCardError(scard.SCARD_E_INVALID_HANDLE, "Card");
  return entry;
}

export class Context {
  #handles = new Set<bigint>();
  #pending = new Set<Promise<bigint>>();
  #disposing: Promise<void> | null = null;

  async establish(scope: number): Promise<bigint> {
    if (this.#disposing) throw new Error("Context is being disposed");
    uint32(scope, "scope");
    const operation = ResourceContext.establish({ scope }).then((resource) => {
      const handle = resource.handle;
      this.#handles.add(handle);
      contexts.set(handle, { resource, remove: () => this.#handles.delete(handle) });
      return handle;
    });
    this.#pending.add(operation);
    try {
      return await operation;
    } finally {
      this.#pending.delete(operation);
    }
  }
  async listReaders(context: bigint): Promise<string[]> {
    return contextEntry(context).resource.listReaders();
  }
  async getStatusChange(context: bigint, in_reader_states: number[] | Status[] | string[], timeout: number): Promise<Status[]> {
    const { resource } = contextEntry(context);
    uint32(timeout, "timeout");
    if (!Array.isArray(in_reader_states)) throw new TypeError("Expected an array of reader indices, names or statuses");
    const input = in_reader_states.map((value) => {
      if (typeof value === "number" || typeof value === "string") return value;
      if (!value || typeof value.reader !== "string" || !value.state || !Buffer.isBuffer(value.atr)) throw new TypeError("Invalid reader Status");
      return { reader: value.reader, currentState: uint32(value.state.value, "state.value") };
    });
    let names: string[] | undefined;
    if (!input.length || input.some((value) => typeof value === "number")) names = await resource.listReaders();
    const readers = input.length
      ? input.map((value) => {
          if (typeof value === "number") {
            if (!Number.isInteger(value) || value < 0 || !names || value >= names.length) throw new RangeError("Reader index out of range");
            return { reader: names[value], currentState: 0 };
          }
          return typeof value === "string" ? { reader: value, currentState: 0 } : value;
        })
      : (names ?? []).map((reader) => ({ reader, currentState: 0 }));
    if (!readers.length) return [];
    const events = await resource.waitForChange(readers, { timeout });
    return events.map((event) => ({ reader: event.reader, state: { name: stateName(event.eventState), value: event.eventState }, atr: event.atr }));
  }
  async cancel(context: bigint): Promise<void> {
    await contextEntry(context).resource.cancel();
  }
  async release(context: bigint): Promise<void> {
    const entry = contextEntry(context);
    await entry.resource.release();
    for (const [handle, card] of cards) if (card.context === context) cards.delete(handle);
    contexts.delete(context);
    entry.remove();
  }
  async [Symbol.asyncDispose](): Promise<void> {
    if (this.#disposing) return this.#disposing;
    const disposal = Promise.resolve().then(async () => {
      await Promise.allSettled([...this.#pending]);
      const errors: unknown[] = [];
      for (const handle of [...this.#handles].reverse()) {
        try {
          await this.release(handle);
        } catch (error) {
          errors.push(error);
        }
      }
      if (errors.length) throw new AggregateError(errors, "Failed to release PC/SC contexts");
    });
    this.#disposing = disposal;
    try {
      await disposal;
    } finally {
      this.#disposing = null;
    }
  }
}

export class Card {
  async connect(context: bigint, reader: string, shareMode: number, preferred_protocol: number): Promise<bigint> {
    uint32(shareMode, "shareMode");
    uint32(preferred_protocol, "preferred_protocol");
    const resource = await contextEntry(context).resource.connect(reader, { shareMode, preferredProtocols: preferred_protocol });
    const handle = resource.handle;
    cards.set(handle, { resource, context });
    return handle;
  }
  async reconnect(context: bigint, shareMode: number, preferred_protocol: number, initialization: number): Promise<bigint> {
    uint32(shareMode, "shareMode");
    uint32(preferred_protocol, "preferred_protocol");
    uint32(initialization, "initialization");
    await cardEntry(context).resource.reconnect({ shareMode, preferredProtocols: preferred_protocol, initialization });
    return context;
  }
  async disconnect(context: bigint, disposition: number): Promise<void> {
    uint32(disposition, "disposition");
    await cardEntry(context).resource.disconnect(disposition);
    cards.delete(context);
  }
  async transmit(context: bigint, command: Buffer, preferred_protocol: number): Promise<Buffer> {
    uint32(preferred_protocol, "preferred_protocol");
    return cardEntry(context).resource.transmit(command, preferred_protocol);
  }
  async status(context: bigint): Promise<CardStatus> {
    const result = await cardEntry(context).resource.status();
    return { reader: result.readers[0], activeProtocol: { name: protocolName(result.protocol), value: result.protocol }, atr: result.atr };
  }
  async getAttribute(context: bigint, attribute: number): Promise<Buffer | string | number> {
    return cardEntry(context).resource.getAttribute(attribute);
  }
  async control(context: bigint, code: number, data: Buffer, responseCapacity = 4096): Promise<Buffer> {
    return cardEntry(context).resource.control(code, data, responseCapacity);
  }
  async setAttribute(context: bigint, attribute: number, value: Buffer): Promise<void> {
    await cardEntry(context).resource.setAttribute(attribute, value);
  }
  async beginTransaction(context: bigint): Promise<void> {
    await cardEntry(context).resource.beginTransaction();
  }
  async endTransaction(context: bigint, disposition = Disposition.LeaveCard): Promise<void> {
    await cardEntry(context).resource.endTransaction(disposition);
  }
}
