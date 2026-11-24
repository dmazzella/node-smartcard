import { describe, it } from "node:test";
import { inspect } from "node:util";

import { scard } from "@node-ctypes/smartcard";

const INFINITE = 0xffffffff; // Infinite timeout for status change

await describe("Scard", async (stc) => {
  await it("Card", async (tc) => {
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

    const card = new scard.Card();
    const card_handler = await card.connect(ctx, currentState[0].reader, scard.Share.Shared, scard.Protocol.Tx);
    tc.diagnostic(`Card connected: ${inspect(card_handler)}`);

    const card_handler_reconnect = await card.reconnect(card_handler, scard.Share.Shared, scard.Protocol.Tx, scard.Disposition.LeaveCard);
    tc.diagnostic(`Card reconnected: ${inspect(card_handler_reconnect)}`);

    const status = await card.status(card_handler);
    tc.diagnostic(`Card status: ${inspect(status)}`);

    const command = Buffer.from([0x00, 0x84, 0x00, 0x00, 0x20]);
    tc.diagnostic(`Command to transmit: ${inspect(command)}`);
    const response = await card.transmit(card_handler, command, scard.Protocol.T1);
    tc.diagnostic(`Card transmit response: ${inspect(response)}`);

    const attr = await card.getAttribute(card_handler, scard.Attribute.AtrString);
    tc.diagnostic(`Card attribute AtrString: ${inspect(attr)}`);

    await card.disconnect(card_handler, scard.Disposition.LeaveCard);
    tc.diagnostic(`Card disconnected`);

    await context.release(ctx);
    tc.diagnostic(`Context released: ${ctx}`);
  });
});
