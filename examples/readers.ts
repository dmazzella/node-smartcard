import { scard } from "@node-ctypes/smartcard";

await using context = new scard.Context();
const handle = await context.establish(scard.Scope.User);
console.log("Readers:", await context.listReaders(handle));
const statuses = await context.getStatusChange(handle, [], 0);
for (const status of statuses) {
  console.log(status.reader, status.state, status.atr.toString("hex"));
}
