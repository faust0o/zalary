# Zalary

Zalary is a payroll platform that settles salaries in Zcash. You set up employees, assign them to recurring pay schedules, and when it's time to disburse, the app generates a QR code for each payment that your Zcash wallet can scan. The whole thing runs as a web app with a GraphQL backend, so there's no special software to install beyond a browser and a Zcash wallet like Zodl.

Zalary ships a Rust-based Zcash light wallet compiled to WebAssembly that runs entirely in your browser. You provide a unified full viewing key, and the WASM wallet syncs the blockchain in the background, scanning for your transactions. When it finds an outgoing payment that matches one of your payroll entries by amount and timing, it marks that payment as verified on-chain. No server ever sees your spending key, and the chain data never leaves your browser's memory.

Each payroll has a schedule, a set of employees with wallet addresses and USD salaries, and the app converts amounts to ZEC at the current market rate when you kick off a run. Employees can be added individually or imported from a CSV. Once all payments in a run are confirmed, the payroll moves to a completed state and shows when the next cycle is due.
