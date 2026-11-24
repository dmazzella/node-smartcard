import { describe, it } from "node:test";
import { inspect } from "node:util";

import { Delay, scard } from "@node-ctypes/smartcard";
import type { Status } from "@node-ctypes/smartcard/scard";

await describe("Scard", async (stc) => {
  await it("Monitor", async (tc) => {
    const monitor = new scard.Monitor();
    monitor.on("readers-changed", (readers: string[]) => {
      console.log(`Readers changed: ${inspect(readers)}`);
    });
    monitor.on("reader-connected", (readerName: string) => {
      console.log(`Reader connected: ${readerName}`);
    });
    monitor.on("reader-disconnected", (readerName: string) => {
      console.log(`Reader disconnected: ${readerName}`);
    });
    monitor.on("reader-status-update", (readerName: string, status: Status) => {
      console.log(`Reader status update: ${readerName} - ${inspect(status)}`);
    });
    monitor.on("card-inserted", (readerName: string, status: Status) => {
      console.log(`Card inserted: ${readerName} - ${inspect(status)}`);
    });
    monitor.on("card-removed", (readerName: string) => {
      console.log(`Card removed: ${readerName}`);
    });
    monitor.on("card-changed", (readerName: string, status: Status) => {
      console.log(`Card changed: ${readerName} - ${inspect(status)}`);
    });
    monitor.on("no-readers", () => {
      console.log(`No readers available`);
    });
    monitor.on("close", () => {
      console.log(`Monitor closed`);
      monitor.removeAllListeners();
    });
    monitor.on("error", (error: Error) => {
      console.error(`Error: ${error.message}`);
    });

    await monitor.start();
    tc.diagnostic(`Monitoring started`);

    await Delay(1000 * 10);

    monitor.stop();
    tc.diagnostic(`Monitoring stopped`);
  });
});
