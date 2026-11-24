import { Context, Card } from "./runtime.ts";
import { ATR } from "./atr.ts";
import { Monitor } from "./monitor.ts";
import { Scope, State, Share, Protocol, Disposition, Attribute } from "./constants.ts";
import { SCardError } from "./low-level/index.ts";

export { Context, Card, ATR, Monitor, Scope, State, Share, Protocol, Disposition, Attribute, SCardError };
export type { Status, CardStatus, SmartCardEvents } from "./types.ts";
export type { AtrRendering } from "./atr.ts";
export const version = "0.1.0";
export const scard = Object.freeze({ Context, Card, ATR, Monitor, Scope, State, Share, Protocol, Disposition, Attribute, version });
export const smartcard = scard;
export function Delay(milliseconds: number): Promise<void> {
  if (!Number.isFinite(milliseconds) || milliseconds < 0 || milliseconds > 0x7fffffff) throw new RangeError("Invalid delay");
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
export type Scard = typeof scard;
