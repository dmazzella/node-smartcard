import { describe, it } from "node:test";
import { inspect } from "node:util";

import { scard } from "@node-ctypes/smartcard";

await describe("Scard", async (stc) => {
  await it("ATR hex render", async (tc) => {
    const atr = new scard.ATR("3BFF1800008131FE45006B05052000012101434E5310318079");
    tc.diagnostic(atr.render());
  });
  await it("ATR hex renderObject", async (tc) => {
    const atr = new scard.ATR("3BFF1800008131FE45006B05052000012101434E5310318079");
    tc.diagnostic(`${inspect(atr.renderObject(), { depth: null, colors: true })}`);
  });
  await it("ATR Buffer render", async (tc) => {
    const atr = new scard.ATR(Buffer.from("3BFF1800008131FE45006B05052000012101434E5310318079", "hex"));
    tc.diagnostic(atr.render());
  });
  await it("ATR Buffer renderObject", async (tc) => {
    const atr = new scard.ATR(Buffer.from("3BFF1800008131FE45006B05052000012101434E5310318079", "hex"));
    tc.diagnostic(`${inspect(atr.renderObject(), { depth: null, colors: true })}`);
  });
});
