import { Monitor, Delay } from "@node-ctypes/smartcard";

await using monitor = new Monitor();
monitor.on("reader-connected", (reader) => console.log("Connected:", reader));
monitor.on("reader-disconnected", (reader) => console.log("Disconnected:", reader));
monitor.on("card-inserted", (reader, status) => console.log("Card inserted:", reader, status.atr.toString("hex")));
monitor.on("card-removed", (reader) => console.log("Card removed:", reader));
monitor.on("error", (error) => console.error(error));
await monitor.start();
await Delay(10000);
monitor.stop();
