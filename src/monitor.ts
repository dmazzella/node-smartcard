import { EventEmitter } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { Context } from "./runtime.ts";
import { Scope, State } from "./constants.ts";
import { SCardError, SCARD_E_CANCELLED, SCARD_E_TIMEOUT } from "./low-level/index.ts";
import type { SmartCardEvents, Status } from "./types.ts";

type EventMap = { [K in keyof SmartCardEvents]: Parameters<SmartCardEvents[K]> };
export class Monitor extends EventEmitter<EventMap> {
  #running = false;
  #task: Promise<void> | null = null;
  #known = new Set<string>();
  #states = new Map<string, Status>();
  #controller: AbortController | null = null;
  #cancelWait: (() => void) | null = null;

  async start(): Promise<void> {
    if (this.#running) return;
    if (this.#task) await this.#task;
    if (this.#running) return;
    this.#running = true;
    this.#known.clear();
    this.#states.clear();
    const controller = new AbortController();
    this.#controller = controller;
    const task = this.#loop(controller.signal);
    this.#task = task;
    task.catch((error: unknown) => {
      queueMicrotask(() => {
        throw error;
      });
    });
  }
  stop(): void {
    this.#running = false;
    this.#controller?.abort();
    this.#cancelWait?.();
  }
  isMonitoring(): boolean {
    return this.#running;
  }

  async #loop(signal: AbortSignal): Promise<void> {
    try {
      while (this.#running) {
        try {
          // Reuse one PC/SC context across polling iterations instead of loading/unloading winscard every 250ms.
          await using context = new Context();
          const handle = await context.establish(Scope.User);
          this.#cancelWait = () => {
            void context.cancel(handle).catch(() => undefined);
          };
          try {
            while (this.#running) {
              const readers = await context.listReaders(handle);
              if (!this.#running) break;
              this.#readers(readers);
              if (!readers.length) {
                this.emit("no-readers");
                try {
                  await delay(250, undefined, { signal });
                } catch (error) {
                  if (!signal.aborted) throw error;
                }
                continue;
              }
              const unknown = readers.filter((reader) => !this.#states.has(reader));
              if (unknown.length > 0) {
                const initial = await context.getStatusChange(handle, unknown, 0);
                if (!this.#running) break;
                this.#status(initial);
              }
              const current = readers.map((reader) => this.#states.get(reader)!);
              try {
                const next = await context.getStatusChange(handle, current, 250);
                if (this.#running) this.#status(next);
              } catch (error) {
                if (error instanceof SCardError && (error.code === SCARD_E_TIMEOUT || (!this.#running && error.code === SCARD_E_CANCELLED))) continue;
                throw error;
              }
            }
          } finally {
            this.#cancelWait = null;
          }
        } catch (error) {
          if (!this.#running && error instanceof SCardError && error.code === SCARD_E_CANCELLED) break;
          this.emit("error", error instanceof Error ? error : new Error(String(error)));
          if (this.#running) {
            try {
              await delay(250, undefined, { signal });
            } catch (delayError) {
              if (!signal.aborted) throw delayError;
            }
          }
        }
      }
    } finally {
      this.#running = false;
      this.#controller = null;
      this.#cancelWait = null;
      this.emit("close");
    }
  }
  #readers(readers: string[]): void {
    let changed = false;
    for (const reader of readers) {
      if (!this.#known.has(reader)) {
        this.#known.add(reader);
        this.emit("reader-connected", reader);
        changed = true;
      }
    }
    for (const reader of this.#known) {
      if (!readers.includes(reader)) {
        this.#known.delete(reader);
        this.#states.delete(reader);
        this.emit("reader-disconnected", reader);
        changed = true;
      }
    }
    if (changed) this.emit("readers-changed", readers.slice());
  }
  #status(statuses: Status[]): void {
    for (const status of statuses) {
      const previous = this.#states.get(status.reader);
      const atrChanged = !previous || !status.atr.equals(previous.atr);
      const changed = !previous || (previous.state.value & ~State.Changed) !== (status.state.value & ~State.Changed) || atrChanged;
      const saved = { reader: status.reader, state: { ...status.state }, atr: Buffer.from(status.atr) };
      this.#states.set(status.reader, saved);
      if (!changed) continue;
      const present = Boolean(status.state.value & State.Present);
      const wasPresent = Boolean(previous && previous.state.value & State.Present);
      this.emit("reader-status-update", status.reader, status);
      if (present && !wasPresent) this.emit("card-inserted", status.reader, status);
      else if (!present && wasPresent) this.emit("card-removed", status.reader);
      else if (present && atrChanged) this.emit("card-changed", status.reader, status);
    }
  }
  async [Symbol.asyncDispose](): Promise<void> {
    this.stop();
    if (this.#task) await this.#task;
  }
}
