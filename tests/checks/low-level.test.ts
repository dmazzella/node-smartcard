import assert from "node:assert/strict";
import { test } from "node:test";
import * as ctypes from "node-ctypes";
import { scard } from "../../src/low-level/index.ts";

test("real PC/SC platform exports and constructor errcheck", () => {
  let checked = 0;
  using native = new scard.Native({
    errcheck: (value) => {
      checked++;
      return value;
    },
  });
  assert.equal(native.SCardControl.funcName, process.platform === "darwin" ? "SCardControl132" : "SCardControl");
  assert.equal(native.SCardControl.argtypes?.length, 7);
  assert.equal(native.SCardFreeMemory === null, process.platform === "darwin");
  if (native.SCardFreeMemory !== null) {
    assert.equal(native.SCardFreeMemory.argtypes?.length, 2);
    assert.equal(native.SCardFreeMemory.restype, scard.LONG);
  }
  native.SCardIsValidContext(0n);
  assert.equal(checked, 1);
});

test("real PC/SC low-level sync/async ctypes calls, PCI globals and errcheck", async (tc) => {
  using native = new scard.Native();
  assert.equal(Number(native.SCARD_PCI_T1.dwProtocol), scard.SCARD_PROTOCOL_T1);
  assert.equal(Number(native.SCARD_PCI_T1.cbPciLength), ctypes.sizeof(scard.SCARD_IO_REQUEST));
  assert.equal(native.SCardEstablishContext.restype, scard.LONG);
  assert.equal(native.SCardEstablishContext.argtypes?.length, 4);
  const handle = new scard.SCARDCONTEXT();
  const rv = native.SCardEstablishContext(scard.SCARD_SCOPE_USER, null, null, ctypes.byref(handle));
  if ([scard.SCARD_E_NO_SERVICE, scard.SCARD_E_SERVICE_STOPPED].includes(scard.resultCode(rv))) {
    tc.skip("PC/SC service is not running");
    return;
  }
  scard.checkResult(rv, "SCardEstablishContext");
  try {
    native.SCardIsValidContext.errcheck = (value) => {
      scard.checkResult(value, "SCardIsValidContext");
      return value;
    };
    assert.equal(Number(await native.SCardIsValidContext.callAsync(handle.value)), 0);
  } finally {
    scard.checkResult(await native.SCardReleaseContext.callAsync(handle.value), "SCardReleaseContext");
  }
});
