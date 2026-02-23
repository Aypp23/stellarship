# Relay (Moves + Settlement Automation)

This `socket.io` relay does two jobs:

1. Realtime move forwarding (`move:send` / `move:result`)
2. Post-game settlement automation:
   - builds the canonical transcript
   - runs the local RISC0 prover (`zkbs-prover`)
   - submits `end_game()` on-chain as a relayer account
3. Optional "vs computer" mode:
   - starts `start_game()` as bot Player 2 from Player 1's signed auth entry
   - commits bot board on-chain
   - plays turns via relay
   - commits bot transcript digest for settlement

Important: the verifier router must have the Groth16 selector mapped to your deployed verifier (`add_verifier`) before `end_game()` can pass on-chain verification.

## Config

Copy `apps/relay/.env.example` and fill in:

- `ZK_BATTLESHIP_CONTRACT_ID`
- `RELAYER_SECRET_KEY`
- `BOT_SECRET_KEY` (optional, defaults to `RELAYER_SECRET_KEY` if omitted)
- (optional) `ZKBS_GROTH16_SELECTOR_HEX` if your deployed verifier selector is not the default.

The relayer account must be funded on the target network (Testnet recommended).
`npm --workspace apps/relay run dev` now loads `apps/relay/.env` automatically.

## Run

From repo root:

```bash
cd /Users/aomine/Desktop/stellar
npm --workspace apps/relay run dev
```

## Prover Requirements

Settlement automation needs:

- Docker running (the Groth16 prover uses it)
- `proofs/zk-battleship-risc0/target/release/zkbs-prover` built

Build the prover:

```bash
cd /Users/aomine/Desktop/stellar
cargo build --release --manifest-path proofs/zk-battleship-risc0/host/Cargo.toml
```

## One-Time Verifier Wiring (Testnet)

From repo root, register selector -> verifier in router and configure zk-battleship:

```bash
cd /Users/aomine/Desktop/stellar
./scripts/configure-zkbs-risc0-testnet.sh <ZKBS_CONTRACT_ID> <VERIFIER_ROUTER_ID> <GROTH16_VERIFIER_ID> <IMAGE_ID_HEX>
```
