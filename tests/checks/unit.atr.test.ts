import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scard } from "../../src/index.ts";

const sample = "3BFF1800008131FE45006B05052000012101434E5310318079";
describe("ATR (node-scard reference scenarios)", () => {
  for (const [name, value] of [
    ["hex", sample],
    ["Buffer", Buffer.from(sample, "hex")],
    ["array", [...Buffer.from(sample, "hex")]],
  ] as const) {
    it(`${name} render and renderObject`, () => {
      const atr = new scard.ATR(typeof value === "object" && !Buffer.isBuffer(value) ? [...value] : value);
      assert.equal(atr.toString().replaceAll(" ", ""), sample);
      assert.equal(atr.getTA1(), 0x18);
      assert.equal(atr.getTB1(), 0);
      assert.equal(atr.getTC1(), 0);
      assert.equal(atr.getTD1(), 0x81);
      assert.equal(atr.getChecksum(), 0x79);
      assert.equal(atr.checksumOK, true);
      assert.equal(atr.isT1Supported(), true);
      assert.equal(atr.getHistoricalBytesCount(), 15);
      const rendering = atr.renderObject();
      assert.equal(rendering.hex, atr.toString());
      assert.equal(rendering.TS, "0x3B");
      assert.equal(rendering.FI, "0x01");
      assert.equal(rendering.DI, "0x08");
      assert.equal(rendering.bitRateFactor, 12);
      assert.equal(rendering.clockRateConversion, 372);
      assert.match(atr.render(), /^ATR: 3B FF/);
      assert.match(atr.render(), /T=1 supported: true/);
      const historical = atr.getHistoricalBytes();
      historical[0] = 0xff;
      assert.notEqual(atr.getHistoricalBytes()[0], 0xff);
    });
  }
  it("minimal T=0 ATR has default parameters and no checksum", () => {
    const atr = new scard.ATR("3B00");
    assert.deepEqual(atr.getSupportedProtocols(), { "T=0": true });
    assert.equal(atr.getBitRateFactor(), 1);
    assert.equal(atr.getClockRateConversion(), 372);
    assert.equal(atr.getProgrammingCurrent(), 50);
    assert.equal(atr.getProgrammingVoltage(), 5);
    assert.equal(atr.getGuardTime(), null);
    assert.equal(atr.getChecksum(), null);
    assert.equal(atr.hasChecksum, false);
  });
  it("truncation, invalid bytes/hex and missing TCK are rejected without loops", () => {
    for (const value of ["", "3", "3B0G", "3B8", "0000", "3B80", "3B02FF", "3B8001", "3B000000"]) assert.throws(() => new scard.ATR(value));
    assert.throws(() => new scard.ATR([0x3b, 256]));
    assert.throws(() => new scard.ATR([0x3b, -1]));
    assert.throws(() => new scard.ATR([0x3b, NaN]));
    const corrupt = new scard.ATR(sample.slice(0, -2) + "78");
    assert.equal(corrupt.checksumOK, false);
  });
});
