import { describe, it } from "node:test";
import { inspect } from "node:util";

import { scard } from "@node-ctypes/smartcard";

const INFINITE = 0xffffffff; // Infinite timeout for status change

await describe("Scard", async (stc) => {
  await it("Context", async (tc) => {
    const context = new scard.Context();
    tc.diagnostic(`Context created: ${inspect(context)}`);

    const ctx = await context.establish(scard.Scope.User);
    tc.diagnostic(`Context established: ${ctx}`);

    const readers = await context.listReaders(ctx);
    tc.diagnostic(`Readers: ${inspect(readers)}`);

    let currentState = await context.getStatusChange(ctx, [], INFINITE);
    while (!(currentState[0].state.value & scard.State.Present)) {
      console.log(`Insert a Smartcard: ${inspect(currentState)}`);
      currentState = await context.getStatusChange(ctx, currentState, INFINITE);
    }
    tc.diagnostic(`Smartcard inserted: ${inspect(currentState)}`);

    await context.release(ctx);
    tc.diagnostic(`Context released: ${ctx}`);
  });

  await it("Context asyncDispose", async (tc) => {
    let establishedCtx: bigint;

    {
      await using context = new scard.Context();
      const ctx = await context.establish(scard.Scope.User);
      establishedCtx = ctx;
      tc.diagnostic(`Context established: ${ctx}`);

      const readers = await context.listReaders(ctx);
      tc.diagnostic(`Readers: ${inspect(readers)}`);
      // No explicit release: Symbol.asyncDispose releases tracked contexts on scope exit.
    }

    tc.diagnostic(`Context disposed via asyncDispose: ${establishedCtx}`);
  });
});
