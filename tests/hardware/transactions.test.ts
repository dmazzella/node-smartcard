import assert from "node:assert/strict";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { scard } from "../../src/index.ts";
import { Native, checkResult, resultCode, SCARD_E_INVALID_HANDLE, SCARD_E_NOT_TRANSACTED } from "../../src/low-level/index.ts";

const reader = process.env.NODE_SMARTCARD_TEST_READER;
if (!reader) throw new Error("Set NODE_SMARTCARD_TEST_READER to an authorized reader containing a card. These tests open shared connections and transactions, without APDUs or resets.");

test("context release disconnects a transaction owner while another connection waits", { timeout: 10000 }, async () => {
  await using context = new scard.Context();
  using native = new Native();
  const handle = await context.establish(scard.Scope.User);
  const card = new scard.Card();
  const owner = await card.connect(handle, reader, scard.Share.Shared, scard.Protocol.Tx);
  const waiter = await card.connect(handle, reader, scard.Share.Shared, scard.Protocol.Tx);
  await card.beginTransaction(owner);
  let acquiring = true;
  const acquisition = card.beginTransaction(waiter).then(
    () => {
      acquiring = false;
      return { status: "fulfilled" as const };
    },
    (reason: unknown) => {
      acquiring = false;
      return { status: "rejected" as const, reason };
    },
  );
  await delay(50);
  assert.equal(acquiring, true, "The second connection must be waiting for the owner's transaction");
  const releasing = context.release(handle);
  let released = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Context release waited for the blocked connection before disconnecting its transaction owner")), 1000);
  });
  try {
    await Promise.race([
      releasing.then(() => {
        released = true;
      }),
      deadline,
    ]);
    assert.deepEqual(await acquisition, { status: "fulfilled" });
    await assert.rejects(card.status(owner), /INVALID_HANDLE/);
    await assert.rejects(card.status(waiter), /INVALID_HANDLE/);
  } finally {
    clearTimeout(timer);
    if (!released) {
      // Rescue a failed shutdown without relying on the closing managed context.
      const rv = await native.SCardEndTransaction.callAsync(owner, scard.Disposition.LeaveCard);
      if (![SCARD_E_INVALID_HANDLE, SCARD_E_NOT_TRANSACTED].includes(resultCode(rv))) checkResult(rv, "SCardEndTransaction");
      await releasing;
      await acquisition;
    }
  }
});

test("reconnect tracks the native platform's transaction lifetime", { timeout: 10000 }, async () => {
  await using context = new scard.Context();
  const handle = await context.establish(scard.Scope.User);
  const card = new scard.Card();
  const connection = await card.connect(handle, reader, scard.Share.Shared, scard.Protocol.Tx);
  await card.beginTransaction(connection);
  assert.equal(await card.reconnect(connection, scard.Share.Shared, scard.Protocol.Tx, scard.Disposition.LeaveCard), connection);
  if (process.platform === "win32") {
    await assert.rejects(card.endTransaction(connection), /no active transaction/);
    await card.beginTransaction(connection);
  }
  await card.endTransaction(connection);
});
