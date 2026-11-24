import * as constants from "./constants.ts";

const names = new Map<number, string>();
for (const [name, value] of Object.entries(constants)) {
  if (/^SCARD_[EFWPS]_/.test(name) && typeof value === "number") names.set(value, name);
}

export function resultCode(value: number | bigint): number {
  return Number(BigInt.asUintN(32, BigInt(value)));
}

export class SCardError extends Error {
  readonly code: number;
  readonly codeName: string;
  readonly functionName: string;
  constructor(value: number | bigint, functionName: string) {
    const code = resultCode(value);
    const codeName = names.get(code) ?? "SCARD_UNKNOWN_ERROR";
    super(`${functionName}:${codeName}:0x${code.toString(16).padStart(8, "0")}`);
    this.name = "SCardError";
    this.code = code;
    this.codeName = codeName;
    this.functionName = functionName;
  }
}

export function checkResult(value: number | bigint, functionName: string): void {
  if (resultCode(value) !== constants.SCARD_S_SUCCESS) throw new SCardError(value, functionName);
}
