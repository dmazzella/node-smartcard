import assert from "node:assert/strict";
import { test } from "node:test";
import { scard, SCardError, Delay } from "../../src/index.ts";
import { SCARD_E_CANCELLED, SCARD_E_NO_SERVICE, SCARD_E_SERVICE_STOPPED } from "../../src/low-level/index.ts";

test("real context cancellation and disposal interrupt waits without serializing reader queries", { skip: process.platform === "darwin" }, async (tc) => {
  await using context = new scard.Context();
  let handle: bigint;
  try {
    handle = await context.establish(scard.Scope.User);
  } catch (error) {
    if (error instanceof SCardError && [SCARD_E_NO_SERVICE, SCARD_E_SERVICE_STOPPED].includes(error.code)) {
      tc.skip(`PC/SC unavailable: ${error.message}`);
      return;
    }
    throw error;
  }
  const pnp = "\\\\?PnP?\\Notification";
  const initial = await context.getStatusChange(handle, [pnp], 0);
  const pending = context.getStatusChange(handle, initial, 0xffffffff);
  const cancelled = assert.rejects(pending, (error: unknown) => error instanceof SCardError && error.code === SCARD_E_CANCELLED);
  await Delay(25);
  assert.ok(Array.isArray(await context.listReaders(handle)));
  await context.cancel(handle);
  await cancelled;
  const second = await context.getStatusChange(handle, [pnp], 0);
  const released = assert.rejects(context.getStatusChange(handle, second, 0xffffffff));
  await Delay(25);
  await context.release(handle);
  await released;
});
