import assert from "node:assert/strict";
import { test } from "node:test";
import { scard, smartcard, Monitor, Delay } from "../../src/index.ts";
import { multiString, statusNames, text, returnedLength, capacity } from "../../src/buffers.ts";

test("node-scard namespaces, enums, constructors and method signatures", () => {
  assert.equal(scard, smartcard);
  assert.equal(scard.Monitor, Monitor);
  assert.equal(typeof scard.version, "string");
  assert.equal(scard.Protocol.Tx, 3);
  assert.equal(scard.State.Atrmatch, 0x40);
  assert.equal(scard.State.Inuse, 0x100);
  assert.equal(scard.Disposition.LeaveCard, 0);
  assert.equal(Object.keys(scard.Attribute).length, 45);
  assert.equal(scard.Attribute.VendorSpecificInfo, 0x0007a008);
  assert.deepEqual(
    ["establish", "listReaders", "getStatusChange", "cancel", "release"].map((name) => typeof Reflect.get(scard.Context.prototype, name)),
    Array(5).fill("function"),
  );
  assert.deepEqual(
    ["connect", "reconnect", "disconnect", "transmit", "status", "getAttribute"].map((name) => typeof Reflect.get(scard.Card.prototype, name)),
    Array(6).fill("function"),
  );
});

test("invalid handles and indices fail explicitly without native access", async () => {
  await using context = new scard.Context();
  const card = new scard.Card();
  await assert.rejects(context.listReaders(0n), /INVALID_HANDLE/);
  await assert.rejects(context.getStatusChange(0n, [], 0), /INVALID_HANDLE/);
  await assert.rejects(card.status(0n), /INVALID_HANDLE/);
  await assert.rejects(card.disconnect(0n, scard.Disposition.LeaveCard), /INVALID_HANDLE/);
  await assert.rejects(context.establish(-1), RangeError);
});

test("string encoding and output bounds protect the native boundary", () => {
  for (const windows of [true, false]) {
    const encoding = windows ? "utf16le" : "utf8";
    assert.deepEqual(multiString(Buffer.from("Lettore è 卡\0Reader B\0\0", encoding), windows), ["Lettore è 卡", "Reader B"]);
    assert.equal(text("Lettore è 卡", windows).toString(encoding), "Lettore è 卡\0");
    assert.throws(() => text("bad\0reader", windows), TypeError);
    assert.throws(() => text("\ud800", windows));
    assert.throws(() => multiString(Buffer.from("reader\0", encoding), windows), TypeError);
    assert.deepEqual(statusNames(Buffer.from("reader\0", encoding), windows), ["reader"]);
    assert.deepEqual(statusNames(Buffer.from("reader\0\0", encoding), windows), ["reader"]);
    assert.throws(() => statusNames(Buffer.alloc(0), windows), TypeError);
  }
  assert.throws(() => returnedLength(17n, 16, "test"), RangeError);
  assert.throws(() => returnedLength(-1n, 16, "test"), RangeError);
  assert.throws(() => capacity(16 * 1024 * 1024 + 1), RangeError);
});

test("monitor lifecycle without native access and Delay validation", async () => {
  await using monitor = new Monitor();
  assert.equal(monitor.isMonitoring(), false);
  monitor.stop();
  assert.equal(monitor.isMonitoring(), false);
  assert.throws(() => Delay(-1), RangeError);
  await Delay(1);
});
