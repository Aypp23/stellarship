# Stellarship Operations Runbook

## Scope

Runbook for local/dev operations of:

- web frontend (`apps/web`)
- relay service (`apps/relay`)
- prover binary (`proofs/zk-battleship-risc0`)

## Prerequisites

- Node.js 18+
- npm
- Rust/Cargo
- Docker running (for proof generation path)
- funded Stellar Testnet accounts for relayer/bot

## Configuration

## Web env (`apps/web/.env.local`)

```bash
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_RELAY_URL="http://localhost:3001"
NEXT_PUBLIC_SOROBAN_RPC_URL="https://soroban-testnet.stellar.org"
NEXT_PUBLIC_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
NEXT_PUBLIC_ZK_BATTLESHIP_CONTRACT_ID="C..."
NEXT_PUBLIC_SIMULATION_SOURCE_ADDRESS="G..." # optional, open invites
```

## Relay env (`apps/relay/.env`)

```bash
PORT=3001
SOROBAN_RPC_URL="https://soroban-testnet.stellar.org"
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
ZK_BATTLESHIP_CONTRACT_ID="C..."
RELAYER_SECRET_KEY="S..."
BOT_SECRET_KEY="S..." # optional, defaults to RELAYER_SECRET_KEY
ZKBS_PROVER_BIN="/Users/aomine/Desktop/stellar/proofs/zk-battleship-risc0/target/release/zkbs-prover"
ZKBS_GROTH16_SELECTOR_HEX="73c457ba"
```

## Start services

### Web

```bash
cd /Users/aomine/Desktop/stellar/apps/web
npm run dev
```

Expected:

- `http://localhost:3000`
- Next.js ready output

### Relay

```bash
cd /Users/aomine/Desktop/stellar/apps/relay
npm run dev
```

Expected:

- log: `[relay] listening on :3001`

Health check:

```bash
curl -sS http://localhost:3001/health
```

Expected:

```json
{"ok":true}
```

## Stop services

In each terminal running dev server:

- `Ctrl+C`

## Restart essentials quickly

1. stop web + relay (`Ctrl+C` in both terminals)
2. start relay first (`apps/relay`)
3. start web (`apps/web`)
4. hard-refresh browser if stale chunk 404 appears

## Build/lint checks

### Web lint

```bash
cd /Users/aomine/Desktop/stellar/apps/web
npm run lint
```

### Web build

```bash
cd /Users/aomine/Desktop/stellar/apps/web
npm run build
```

### Relay syntax check

```bash
node --check /Users/aomine/Desktop/stellar/apps/relay/src/server.js
```

## Prover operations

### Build prover binary

```bash
cd /Users/aomine/Desktop/stellar
cargo build --release --manifest-path proofs/zk-battleship-risc0/host/Cargo.toml
```

### Standalone prover run

```bash
cd /Users/aomine/Desktop/stellar
cargo run --release --manifest-path proofs/zk-battleship-risc0/host/Cargo.toml -- \
  --input proofs/zk-battleship-risc0/example-input.json \
  --out /tmp/zkbs-proof.json
```

## Contract/verifier wiring

Required before `end_game` succeeds.

```bash
cd /Users/aomine/Desktop/stellar
./scripts/configure-zkbs-risc0-testnet.sh <ZKBS_CONTRACT_ID> <VERIFIER_ROUTER_ID> <GROTH16_VERIFIER_ID> <IMAGE_ID_HEX>
```

## Operational status semantics (settlement)

Relay publishes phases in `settle:status`:

- `idle`
- `waiting_for_transcript`
- `waiting_for_commits`
- `waiting_for_reveals`
- `proving`
- `submitting`
- `done`
- `error`

Current relay logic gates proving/submitting until transcript commits are visible on-chain (mitigates finality race loops).

## Known incidents and runbook actions

### 1) `txBadSeq`

Symptom:
- tx submission fails with sequence mismatch.

Action:
- wait 1-3s and retry.
- avoid parallel signing from same wallet account.

### 2) `commit_transcript ... TRY_AGAIN_LATER` / short FAILED blip in PvC

Symptom:
- transient relay message appears, then flow continues.

Action:
- no manual action unless it persists.
- if persistent, verify:
  - relay connected,
  - relayer/bot funded,
  - RPC endpoint healthy.

### 3) `Transcript commit not visible on-chain yet`

Symptom:
- waiting-for-commits phase despite recent finalize.

Action:
- allow 10-30s for RPC visibility/finality.
- do not spam finalize clicks.

### 4) Next.js static chunk 404 (`/_next/static/...`)

Symptom:
- UI fails with stale asset 404s.

Action:
1. hard refresh
2. restart web dev server
3. clear browser cache for localhost if needed

### 5) Prover Docker failure

Symptom:
- `docker returned failure exit code` from `zkbs-prover`.

Action:
- start Docker daemon
- rebuild prover
- rerun finalize

## Routine validation checklist

Before demos/submission:

1. web opens at `http://localhost:3000`
2. relay health returns `{"ok":true}`
3. PvP start/commit/play/finalize succeeds
4. PvC start/commit/play/finalize succeeds
5. final settlement tx hash appears and phase reaches `done`
6. no persistent red relayer error

## Useful scripts

- full deterministic terminal flow:

```bash
cd /Users/aomine/Desktop/stellar
./scripts/simulate-terminal-match.sh
```

- dual auth start_game helper:

```bash
cd /Users/aomine/Desktop/stellar
node ./scripts/start-game-dual-auth.mjs
```

## Escalation data to capture

If filing an issue, capture:

- session id
- mode (`Classic`/`Salvo`, PvP/PvC)
- both player addresses
- relayer phase transitions
- tx hash(es)
- full relay error line
- whether Docker was running
- relay/web startup logs

