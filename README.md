# Zalary

Zalary is a payroll platform that settles salaries in Zcash. You set up employees, assign them to recurring pay schedules, and pay them from a shielded multisig treasury that your team controls together. The whole thing runs as a web app with a GraphQL backend, so there's no special software to install beyond a browser with passkey support.

## What the server stores

Transactions live on the Zcash chain, shielded. Everything else Zalary keeps about who gets paid what is sealed in the browser before it reaches the server: employees, payrolls, payroll runs and their payments, every treasury payment's recipients, amounts, PCZT and transaction id, and the treasury's balance. The server stores them as opaque records it can't open, and keeps only what it needs to coordinate: logins, who has access to an account, and who approved and signed each payment.

Opening Zalary asks for a passkey: a new one the first time, the existing one after every sign-in or reload. The passkey unlocks the user's vault (WebAuthn PRF), and from it the browser derives the user's X25519 key pair; only the public key is stored. Each account has one random data key (the account key). The owner's browser creates it, and the owner or a delegate shares it with everyone else in the account by sealing it to their public key, with a click, so a login slipped into the account doesn't get it by itself. Members, delegates and treasury signers all open the same data with it.

Settings → Export my data downloads everything a user can open as CSV files with a README explaining each one, decrypted in their browser.

## Treasury

Every account pays from a treasury: a Zcash address whose spending key is split between its members with [FROST](https://frost.zfnd.org) threshold signatures (rerandomized, over RedPallas, as in the Zcash Foundation's [frost-tools](https://github.com/ZcashFoundation/frost-tools)). The account owner creates it, invites members with one link per member slot, and picks how many of them must approve each payment. The members then run a key ceremony (FROST DKG) together in their browsers. No complete spending key ever exists, on any device or on the server.

Each member's key share is encrypted in their browser with a key derived from their passkey (WebAuthn PRF) before it is stored. Every signer also gets the treasury's viewing key, sealed to them by the owner (the coordinator), and their browser checks that it belongs to their own key share and that the treasury's published addresses are the ones it derives. Zalary's server only ever sees ciphertext. FROST messages travel end to end encrypted (Noise, as frost-client does) through ZF's `frostd` relay, which the server reaches on its private network and exposes to browsers through a same-origin `/frostd` proxy.

When payroll is due, the coordinator bundles every salary into one ZIP-321 payment request, builds and proves the transaction (a PCZT) in the browser, and proposes a copy without the viewing key or the spent notes. Members check the transaction their own browser decodes, approve it (FROST round 1) and, once enough have approved, sign it (round 2), but only the exact transaction they checked. The coordinator then aggregates the signatures and broadcasts a single shielded transaction. Spends wait up to a day for approvals. [How signing works](apps/web/src/lib/treasury/README.md) walks through it step by step.

People with access to an account are either members, who can see employees, payrolls and payments and co-sign if they hold a key share, or delegates, who can also edit employees and payrolls.

## Wallet sync

Zalary ships a Rust-based Zcash light wallet compiled to WebAssembly (`packages/zcash-view-wasm`) that runs entirely in the coordinator's browser. It syncs the treasury in the background, reports the balance (sealed) for the other members, builds and proves spends, and marks payments complete once their transaction is mined. The same module runs the FROST, Noise and PCZT signing code.

Each payroll has a schedule, a set of employees with wallet addresses and USD salaries, and the app converts amounts to ZEC at the current market rate when you kick off a run. Employees can be added individually or imported from a CSV. Once a run's transaction is confirmed, the payroll moves to a completed state and shows when the next cycle is due.

## Running locally

`bun run dev` at the repo root runs everything on the server's port (4000 by default), the way production serves it: the server restarts on changes, the web app rebuilds into `apps/web/dist` on every change, GraphQL types regenerate, and open pages reload once a rebuild lands.

- `apps/server`: GraphQL API (Apollo, Nexus, Prisma on Postgres). Copy `.env.example` to `.env` first.
- `apps/web`: Vite + React app. `VITE_ZCASH_NETWORK=test` points the treasury at testnet.
- `frostd`: `cargo install --git https://github.com/ZcashFoundation/frost-tools.git frostd`, then `frostd --no-tls-very-insecure` and set `FROSTD_URL=http://localhost:2744` for the server.

Railway infrastructure, including the frostd service (`deploy/frostd/Dockerfile`), is defined in `.railway/railway.ts`.
