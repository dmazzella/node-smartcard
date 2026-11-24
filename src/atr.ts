export interface AtrRendering {
  hex: string;
  TS: string;
  T0: string;
  interfaceBytes: { index: number; TA: string | null; TB: string | null; TC: string | null; TD: string | null }[];
  supportedProtocols: string[];
  isT0Supported: boolean;
  isT1Supported: boolean;
  isT15Supported: boolean;
  FI: string | null;
  DI: string | null;
  II: string | null;
  PI1: string | null;
  N: string | null;
  clockRateConversion: number | string;
  bitRateFactor: number | string;
  programmingCurrent: number | string;
  programmingVoltage: number;
  guardTime: number | null;
  hasChecksum: boolean;
  checksumOK: boolean | null;
  TCK: string | null;
  historicalBytes: number[];
}
const hex = (value: number | null): string | null => (value === null ? null : `0x${value.toString(16).padStart(2, "0").toUpperCase()}`);

export class ATR {
  static clockrateconversion: Array<number | string> = [372, 372, 558, 744, 1116, 1488, 1860, "RFU", "RFU", 512, 768, 1024, 1536, 2048, "RFU", "RFU"];
  static bitratefactor: Array<number | string> = ["RFU", 1, 2, 4, 8, 16, 32, 64, 12, 20, "RFU", "RFU", "RFU", "RFU", "RFU", "RFU"];
  static currenttable: Array<number | string> = [25, 50, 100, "RFU"];
  atr: number[];
  TS: number;
  T0: number;
  K: number;
  TA: Array<number | null> = [];
  TB: Array<number | null> = [];
  TC: Array<number | null> = [];
  TD: Array<number | null> = [];
  Y: number[] = [];
  interfaceBytesCount = 0;
  historicalBytes: number[] = [];
  TCK: number | null = null;
  checksumOK: boolean | null = null;
  hasChecksum = false;
  FI: number | null = null;
  DI: number | null = null;
  II: number | null = null;
  PI1: number | null = null;
  N: number | null = null;

  constructor(atr: number[] | string | Buffer) {
    let bytes: number[];
    if (typeof atr === "string") {
      const value = atr.replace(/\s+/g, "");
      if (!/^(?:[0-9a-f]{2})+$/i.test(value)) throw new TypeError("ATR must be a complete hexadecimal byte sequence");
      bytes = [...Buffer.from(value, "hex")];
    } else if (Buffer.isBuffer(atr) || Array.isArray(atr)) bytes = [...atr];
    else throw new TypeError("ATR must be a hex string, Buffer or byte array");
    if (bytes.length < 2 || bytes.length > 33 || bytes.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255)) throw new RangeError("ATR must contain between 2 and 33 bytes");
    if (bytes[0] !== 0x3b && bytes[0] !== 0x3f) throw new Error(`invalid TS 0x${bytes[0].toString(16).padStart(2, "0")}`);
    this.atr = bytes;
    this.TS = bytes[0];
    this.T0 = bytes[1];
    this.K = this.T0 & 15;
    let next = this.T0;
    let offset = 2;
    let needsChecksum = false;
    do {
      const presence = next >>> 4;
      this.Y.push(presence);
      const group = [1, 2, 4, 8].map((mask) => {
        if (!(presence & mask)) return null;
        if (offset >= bytes.length) throw new RangeError("Truncated ATR interface bytes");
        return bytes[offset++];
      });
      this.TA.push(group[0]);
      this.TB.push(group[1]);
      this.TC.push(group[2]);
      this.TD.push(group[3]);
      if (group[3] === null) break;
      next = group[3];
      needsChecksum ||= (next & 15) !== 0;
    } while (true);
    this.interfaceBytesCount = offset - 2;
    if (offset + this.K > bytes.length) throw new RangeError("Truncated ATR historical bytes");
    this.historicalBytes = bytes.slice(offset, offset + this.K);
    offset += this.K;
    const remaining = bytes.length - offset;
    if (remaining > 1 || (needsChecksum && remaining !== 1)) throw new RangeError("Invalid ATR checksum length");
    this.hasChecksum = remaining === 1;
    if (this.hasChecksum) {
      this.TCK = bytes[offset];
      this.checksumOK = bytes.slice(1).reduce((a, b) => a ^ b, 0) === 0;
    }
    if (this.TA[0] !== null) {
      this.FI = this.TA[0] >>> 4;
      this.DI = this.TA[0] & 15;
    }
    if (this.TB[0] !== null) {
      this.II = (this.TB[0] >>> 5) & 3;
      this.PI1 = this.TB[0] & 31;
    }
    this.N = this.TC[0];
  }
  getChecksum(): number | null {
    return this.TCK;
  }
  getHistoricalBytes(): number[] {
    return this.historicalBytes.slice();
  }
  getHistoricalBytesCount(): number {
    return this.historicalBytes.length;
  }
  getInterfaceBytesCount(): number {
    return this.interfaceBytesCount;
  }
  getTA1(): number | null {
    return this.TA[0];
  }
  getTB1(): number | null {
    return this.TB[0];
  }
  getTC1(): number | null {
    return this.TC[0];
  }
  getTD1(): number | null {
    return this.TD[0];
  }
  getBitRateFactor(): number | string {
    return this.DI === null ? 1 : ATR.bitratefactor[this.DI];
  }
  getClockRateConversion(): number | string {
    return this.FI === null ? 372 : ATR.clockrateconversion[this.FI];
  }
  getProgrammingCurrent(): number | string {
    return this.II === null ? 50 : ATR.currenttable[this.II];
  }
  getProgrammingVoltage(): number {
    return this.PI1 === null ? 5 : 5 * (1 + this.PI1);
  }
  getGuardTime(): number | null {
    return this.N;
  }
  getSupportedProtocols(): Record<string, boolean> {
    const protocols: Record<string, boolean> = {};
    for (const td of this.TD) if (td !== null) protocols[`T=${td & 15}`] = true;
    if (this.TD[0] === null) protocols["T=0"] = true;
    return protocols;
  }
  #hasProtocol(protocol: number): boolean {
    if (this.TD[0] === null) return protocol === 0;
    for (const td of this.TD) if (td !== null && (td & 15) === protocol) return true;
    return false;
  }
  isT0Supported(): boolean {
    return this.#hasProtocol(0);
  }
  isT1Supported(): boolean {
    return this.#hasProtocol(1);
  }
  isT15Supported(): boolean {
    return this.#hasProtocol(15);
  }
  toString(): string {
    return this.atr.map((byte) => byte.toString(16).padStart(2, "0").toUpperCase()).join(" ");
  }
  render(): string {
    const lines = [`ATR: ${this.toString()}`, `TS: 0x${this.TS.toString(16).padStart(2, "0")}`, `T0: 0x${this.T0.toString(16).padStart(2, "0")}`];
    this.TA.forEach((_, index) => {
      for (const [name, values] of [
        ["TA", this.TA],
        ["TB", this.TB],
        ["TC", this.TC],
        ["TD", this.TD],
      ] as const) {
        const byte = values[index];
        if (byte !== null) lines.push(`${name}${index + 1}: 0x${byte.toString(16).padStart(2, "0")}`);
      }
    });
    lines.push(`supported protocols ${Object.keys(this.getSupportedProtocols()).join(",")}`, `T=0 supported: ${this.isT0Supported()}`, `T=1 supported: ${this.isT1Supported()}`);
    if (this.TCK !== null) lines.push(`checksum: ${this.TCK}`);
    lines.push(
      `\tclock rate conversion factor: ${this.getClockRateConversion()}`,
      `\tbit rate adjustment factor: ${this.getBitRateFactor()}`,
      `\tmaximum programming current: ${this.getProgrammingCurrent()}`,
      `\tprogramming voltage: ${this.getProgrammingVoltage()}`,
      `\tguard time: ${this.getGuardTime()}`,
      `nb of interface bytes: ${this.getInterfaceBytesCount()}`,
      `nb of historical bytes: ${this.getHistoricalBytesCount()}`,
    );
    return lines.join("\n");
  }
  renderObject(): AtrRendering {
    return {
      hex: this.toString(),
      TS: hex(this.TS)!,
      T0: hex(this.T0)!,
      interfaceBytes: this.TA.map((value, index) => ({ index: index + 1, TA: hex(value), TB: hex(this.TB[index]), TC: hex(this.TC[index]), TD: hex(this.TD[index]) })),
      supportedProtocols: Object.keys(this.getSupportedProtocols()),
      isT0Supported: this.isT0Supported(),
      isT1Supported: this.isT1Supported(),
      isT15Supported: this.isT15Supported(),
      FI: hex(this.FI),
      DI: hex(this.DI),
      II: hex(this.II),
      PI1: hex(this.PI1),
      N: hex(this.N),
      clockRateConversion: this.getClockRateConversion(),
      bitRateFactor: this.getBitRateFactor(),
      programmingCurrent: this.getProgrammingCurrent(),
      programmingVoltage: this.getProgrammingVoltage(),
      guardTime: this.getGuardTime(),
      hasChecksum: this.hasChecksum,
      checksumOK: this.checksumOK,
      TCK: hex(this.TCK),
      historicalBytes: this.getHistoricalBytes(),
    };
  }
}
