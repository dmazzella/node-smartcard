import type { Native } from "./low-level/index.ts";

export interface ContextOptions {
  scope?: number;
  libraryPath?: string;
  native?: Native;
}
export interface ConnectOptions {
  shareMode?: number;
  preferredProtocols?: number;
}
export interface ReconnectOptions extends ConnectOptions {
  initialization?: number;
}
export interface ReaderState {
  reader: string;
  currentState?: number;
}
export interface ReaderEvent {
  readonly reader: string;
  readonly currentState: number;
  readonly eventState: number;
  readonly atr: Buffer;
}
export interface WaitOptions {
  timeout?: number;
  signal?: AbortSignal;
}
export interface ResourceCardStatus {
  readonly readers: string[];
  readonly state: number;
  readonly protocol: number;
  readonly atr: Buffer;
}
export interface TransmitOptions {
  responseCapacity?: number;
}

export interface Status {
  reader: string;
  state: { name: string; value: number };
  atr: Buffer;
}
export interface CardStatus {
  reader: string;
  activeProtocol: { name: string; value: number };
  atr: Buffer;
}
export interface SmartCardEvents {
  "readers-changed": (readers: string[]) => void;
  "reader-connected": (readerName: string) => void;
  "reader-disconnected": (readerName: string) => void;
  "reader-status-update": (readerName: string, status: Status) => void;
  "card-inserted": (readerName: string, status: Status) => void;
  "card-removed": (readerName: string) => void;
  "card-changed": (readerName: string, status: Status) => void;
  "no-readers": () => void;
  close: () => void;
  error: (error: Error) => void;
}
