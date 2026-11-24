---
title: Building, testing and internals
---

# Building, testing and internals

## Scripts

```sh
npm run build                # compile TypeScript to dist/
npm run typecheck            # strict typecheck of src/
npm run test:types           # declaration and consumer API type tests
npm run test:unit            # hardware-free unit tests (ATR, ABI layouts, contracts)
npm run test:checks          # real OS PC/SC checks (no card connection or APDUs sent)
npm run test:checks:mirrored # PC/SC checks under NODE_CTYPES_NO_EXTERNAL_BUFFERS=1 (Electron / mirror mode)
npm test                     # full node-scard reference suite (requires a real reader & authorized card)
npm run test:mirrored        # full reference suite under mirror mode
npm run test:transactions    # hardware transaction regression suite (requires NODE_SMARTCARD_TEST_READER)
npm run docs                 # generate TypeDoc HTML documentation in docs/
npm run docs:serve           # generate docs and serve locally
npm pack --dry-run           # inspect npm package contents
```

## Hardware tests

- `npm run test:checks` and `npm run test:checks:mirrored` exercise the live OS PC/SC service without connecting to any card or transmitting APDUs (skipping cleanly when the PC/SC service is stopped).
- `npm test` / `npm run test:mirrored` run the reference `node-scard` suite (`tests/src/*.test.ts`), which requires a real reader and an authorized card (sends `GET CHALLENGE` `00 84 00 00 20` over `T=1`).
- `npm run test:transactions` runs transaction and reconnect regressions against the reader named in `NODE_SMARTCARD_TEST_READER` without transmitting APDUs.

## Internal architecture

Detailed platform ABI tables, cancellation flows and resource-ownership invariants (in Italian) are documented in [FLOWS.md](../FLOWS.md).

## CI and documentation

- The [CI workflow](../.github/workflows/ci.yml) runs build, type checks, unit tests and PC/SC checks.
- The [Docs workflow](../.github/workflows/docs.yml) builds the TypeDoc site (`npm run docs`) and deploys it to GitHub Pages on release tags (`v*`) or manual dispatch.
