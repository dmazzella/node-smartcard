import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scard, SCardError } from "../../src/index.ts";
import { SCARD_E_NO_SERVICE, SCARD_E_SERVICE_STOPPED } from "../../src/low-level/index.ts";

describe("Context (real system PC/SC, no simulated provider)", () => {
  it("establish/listReaders/getStatusChange/release and asyncDispose", async (tc) => {
    await using context = new scard.Context();
    let handle: bigint;
    try {
      handle = await context.establish(scard.Scope.User);
    } catch (error) {
      if (error instanceof SCardError && [SCARD_E_NO_SERVICE, SCARD_E_SERVICE_STOPPED].includes(error.code)) {
        tc.skip(`PC/SC service unavailable: ${error.message}`);
        return;
      }
      throw error;
    }
    assert.equal(typeof handle, "bigint");
    const readers = await context.listReaders(handle);
    assert.ok(readers.every((reader) => typeof reader === "string"));
    const statuses = await context.getStatusChange(handle, [], 0);
    assert.ok(statuses.every((status) => typeof status.reader === "string" && typeof status.state.name === "string" && typeof status.state.value === "number" && Buffer.isBuffer(status.atr)));
    if (readers.length) {
      const indexed = await context.getStatusChange(handle, [0], 0);
      assert.equal(indexed[0].reader, readers[0]);
    } else assert.deepEqual(statuses, []);
    await context.release(handle);
    await assert.rejects(context.listReaders(handle), /INVALID_HANDLE/);
  });
});
