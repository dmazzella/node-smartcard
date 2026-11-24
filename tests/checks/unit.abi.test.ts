import assert from "node:assert/strict";
import { test } from "node:test";
import { createTypes, platformConstants, SCARD_CTL_CODE, SCardError, resultCode, checkResult } from "../../src/low-level/index.ts";
import * as ctypes from "node-ctypes";

test("platform-specific PC/SC layouts are not pointer-sized handles everywhere", () => {
  for (const platform of ["win32", "darwin", "linux"] as const) {
    const types = createTypes(platform);
    assert.equal(ctypes.sizeof(types.DWORD), platform === "linux" ? ctypes.sizeof(ctypes.c_ulong) : 4);
    assert.equal(ctypes.sizeof(types.SCARDCONTEXT), platform === "win32" ? ctypes.sizeof(ctypes.c_void_p) : platform === "darwin" ? 4 : ctypes.sizeof(ctypes.c_long));
    if (platform === "darwin") assert.equal(ctypes.sizeof(types.SCARD_READERSTATE), ctypes.sizeof(ctypes.c_void_p) * 2 + 12 + 33);
    assert.equal(types.SCARD_READERSTATE.fields.find((field) => field.name === "rgbAtr")?.offset, ctypes.sizeof(ctypes.c_void_p) * 2 + ctypes.sizeof(types.DWORD) * 3);
    assert.equal(platformConstants(platform).MAX_ATR_SIZE, platform === "win32" ? 36 : 33);
  }
});

test("error codes normalize signed LONGs and preserve function names", () => {
  assert.equal(resultCode(-2146435062n), 0x8010000a);
  assert.throws(
    () => checkResult(-2146435062n, "SCardGetStatusChange"),
    (error: unknown) => error instanceof SCardError && error.code === 0x8010000a && error.functionName === "SCardGetStatusChange",
  );
  checkResult(0n, "test");
});

test("control codes and platform-specific protocol/card states", () => {
  assert.equal(SCARD_CTL_CODE(3500, "win32"), 0x003136b0);
  assert.equal(SCARD_CTL_CODE(3500, "linux"), 0x42000dac);
  assert.throws(() => SCARD_CTL_CODE(-1), RangeError);
  assert.equal(platformConstants("win32").SCARD_PROTOCOL_RAW, 0x10000);
  assert.equal(platformConstants("linux").SCARD_PROTOCOL_RAW, 4);
  assert.equal(platformConstants("win32").SCARD_SPECIFIC, 6);
  assert.equal(platformConstants("darwin").SCARD_SPECIFIC, 64);
});
