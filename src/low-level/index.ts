import * as constants from "./constants.ts";
import * as data from "./types.ts";
import { Native, defaultLibraryPath } from "./native.ts";
import { SCardError, checkResult, resultCode } from "./errors.ts";

export * from "./constants.ts";
export * from "./types.ts";
export * from "./native.ts";
export * from "./errors.ts";
export const scard = Object.freeze({ ...constants, ...data, Native, defaultLibraryPath, SCardError, checkResult, resultCode });
