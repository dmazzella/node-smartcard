import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import { scard, Delay } from "../../src/index.ts";
import { SCardError, SCARD_E_NO_SERVICE, SCARD_E_SERVICE_STOPPED } from "../../src/low-level/index.ts";

test("Monitor: reference events and asynchronous shutdown on the real PC/SC service", async (tc) => {
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
  await context.release(handle);
  await using monitor = new scard.Monitor();
  const errors: Error[] = [];
  let closed = 0;
  monitor.on("error", (error) => errors.push(error));
  monitor.on("close", () => closed++);
  monitor.on("reader-connected", (reader) => assert.equal(typeof reader, "string"));
  monitor.on("reader-status-update", (reader, status) => {
    assert.equal(status.reader, reader);
    assert.ok(Buffer.isBuffer(status.atr));
  });
  await monitor.start();
  await monitor.start();
  assert.equal(monitor.isMonitoring(), true);
  await Delay(400);
  const closing = once(monitor, "close");
  monitor.stop();
  assert.equal(monitor.isMonitoring(), false);
  await closing;
  assert.equal(closed, 1);
  assert.deepEqual(errors, []);
});
