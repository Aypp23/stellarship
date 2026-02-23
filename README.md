# Stellarship

Stellarship is a zero-knowledge, hidden-information naval strategy game on Stellar Testnet.

Players commit private boards on-chain, play locally/through relay, commit a transcript digest, and finalize with a RISC Zero Groth16 proof that is verified on-chain before settlement.

## Why this project exists

This project was built for the Stellar ZK gaming hackathon requirement:

- meaningful ZK gameplay mechanic,
- deployed on-chain component on Stellar Testnet,
- integration with Game Hub `start_game()` / `end_game()`.

Required Game Hub (from `task.md`):

- `CB4VZAT2U3UC6XFK3N23SKRF2NDCMP3QHJYMCHHFMZO7MRQO6DQ2EMYG`

Your deployed `zk-battleship` contract must be initialized with that Game Hub ID via constructor arg `game_hub`.

## Core mechanics

- Hidden board commitments:
  - each player commits `sha256(salt_32_bytes || board_bits_8_bytes)` on-chain.
- Hidden-information gameplay:
  - shots/results are exchanged in real time via relay events.
- Transcript commitment:
  - each player commits the same `sha256(transcript_bytes)` on-chain.
- Proof-based settlement:
  - relayer/prover generates a Groth16 proof and submits `end_game(session_id, seal, journal)`.
  - contract verifies proof and journal binding, then calls Game Hub `end_game()`.

## Modes

- `Classic` (`mode_id=0`): 1 shot per turn.
- `Salvo` (`mode_id=1`): 2 shots per turn.

`mode_id` is enforced on-chain in `start_game()` auth args.

## Repository layout

```text
/Users/aomine/Desktop/stellar
├─ apps/
│  ├─ web/                # Next.js frontend (wallet + lobby + match UI)
│  └─ relay/              # Socket.io relay + settlement orchestration + PvC bot
├─ contracts/
│  ├─ zk-battleship/      # Soroban game contract
│  └─ stellar-risc0-verifier/ # Nethermind verifier/router workspace
├─ proofs/
│  └─ zk-battleship-risc0/ # Off-chain RISC Zero prover host/guest
├─ scripts/
│  ├─ simulate-terminal-match.sh
│  ├─ start-game-dual-auth.mjs
│  ├─ configure-zkbs-risc0-testnet.sh
│  └─ set-zkbs-verifier-testnet.sh
└─ task.md
```

## Architecture

```mermaid
flowchart LR
  W["Web App (Next.js)"]
  R["Relay (Socket.io + settlement worker)"]
  C["zk-battleship Contract"]
  GH["Game Hub Contract"]
  P["RISC0 Prover (zkbs-prover)"]
  VR["Verifier Router + Groth16 Verifier"]

  W <--> R
  W -->|start_game, commit_board, commit_transcript| C
  C -->|start_game/end_game calls| GH
  R -->|read session/settle orchestration| C
  R -->|proof input| P
  P -->|seal + journal| R
  C -->|verify(seal, image_id, sha256(journal))| VR
```

## Transaction model (what each hash represents)

1. `start_game(...)`
- initializes session and locks points in Game Hub.
- both players sign auth entries (SGS-style multi-auth flow).

2. `commit_board(session_id, player, commitment)`
- stores only commitment hash for each player board.
- does not reveal salt or board bits.

3. `commit_transcript(session_id, player, transcript_digest)`
- each player commits one digest of the canonical transcript.
- both digests must match.

4. `end_game(session_id, seal, journal)`
- verifies Groth16 proof via verifier router.
- validates journal against on-chain commitments + transcript digests.
- calls Game Hub `end_game()`.

Note on final tx hash in PvP/PvC:
- both clients show the same final relayer tx hash because settlement is a single shared on-chain `end_game` transaction for that session.

## Contract details (`contracts/zk-battleship/src/lib.rs`)

Constructor:

- `__constructor(admin, game_hub, verifier_router, image_id)`

Key methods:

- `start_game(session_id, mode_id, player1, player2, player1_points, player2_points)`
- `get_session(session_id)`
- `commit_board(session_id, player, commitment)`
- `commit_transcript(session_id, player, transcript_digest)`
- `end_game(session_id, seal, journal)`
- `set_verifier(verifier_router, image_id)`

Important errors:

- `TranscriptNotCommitted` (`#9`)
- `AlreadyCommittedTranscript` (`#10`)
- `InvalidJournal` (`#7`)

Journal format (`105` bytes):

- `0..4`: `session_id` (`u32` BE)
- `4..8`: `mode_id` (`u32` BE)
- `8..40`: `player1_commitment` (32 bytes)
- `40..72`: `player2_commitment` (32 bytes)
- `72..104`: `transcript_digest` (32 bytes)
- `104`: `player1_won` (`u8`, 0/1)

## Prerequisites

- Node.js 18+ (recommended 20+)
- npm
- Rust + Cargo
- Stellar CLI (`stellar`)
- Docker (required for RISC Zero proving flow)
- Freighter (recommended wallet, especially for `signAuthEntry` flows)

## Install

From repo root:

```bash
cd /Users/aomine/Desktop/stellar
npm install
```

## Environment configuration

### Web (`apps/web/.env.local`)

Create `/Users/aomine/Desktop/stellar/apps/web/.env.local`:

```bash
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_RELAY_URL="http://localhost:3001"
NEXT_PUBLIC_SOROBAN_RPC_URL="https://soroban-testnet.stellar.org"
NEXT_PUBLIC_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
NEXT_PUBLIC_ZK_BATTLESHIP_CONTRACT_ID="C..."

# Optional: needed for open invites without known player2 during simulation path
NEXT_PUBLIC_SIMULATION_SOURCE_ADDRESS="G..."
```

### Relay (`apps/relay/.env`)

Copy from example and fill values:

```bash
cp /Users/aomine/Desktop/stellar/apps/relay/.env.example /Users/aomine/Desktop/stellar/apps/relay/.env
```

Required/important keys:

```bash
PORT=3001
SOROBAN_RPC_URL="https://soroban-testnet.stellar.org"
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
ZK_BATTLESHIP_CONTRACT_ID="C..."
RELAYER_SECRET_KEY="S..."

# Optional (defaults to RELAYER_SECRET_KEY if omitted)
BOT_SECRET_KEY="S..."

# Optional
ZKBS_PROVER_BIN="/Users/aomine/Desktop/stellar/proofs/zk-battleship-risc0/target/release/zkbs-prover"
ZKBS_GROTH16_SELECTOR_HEX="73c457ba"
```

Operational notes:

- `RELAYER_SECRET_KEY` account pays fees for relay-side submissions.
- `BOT_SECRET_KEY` is Player 2 for PvC and should be a funded account.
- In PvC, bot account must not equal Player 1 address.

## Run local development

Open 2 terminals.

Terminal 1 (web):

```bash
cd /Users/aomine/Desktop/stellar/apps/web
npm run dev
```

Terminal 2 (relay):

```bash
cd /Users/aomine/Desktop/stellar/apps/relay
npm run dev
```

Or from root workspace scripts:

```bash
cd /Users/aomine/Desktop/stellar
npm run dev:web
npm run dev:relay
```

Endpoints:

- Web: [http://localhost:3000](http://localhost:3000)
- Relay health: [http://localhost:3001/health](http://localhost:3001/health)

## Build and lint

Web:

```bash
cd /Users/aomine/Desktop/stellar/apps/web
npm run lint
npm run build
npm run start
```

Relay:

```bash
cd /Users/aomine/Desktop/stellar/apps/relay
npm run start
```

## Verifier/router wiring (required before `end_game` works)

You must map Groth16 selector to verifier and configure the game contract image id.

Use:

```bash
cd /Users/aomine/Desktop/stellar
./scripts/configure-zkbs-risc0-testnet.sh <ZKBS_CONTRACT_ID> <VERIFIER_ROUTER_ID> <GROTH16_VERIFIER_ID> <IMAGE_ID_HEX>
```

This script:

- reads `selector` from Groth16 verifier,
- ensures router mapping via `add_verifier(selector, verifier)`,
- calls `set_verifier(verifier_router, image_id)` on `zk-battleship`.

If you only need to update router/image_id on game contract:

```bash
cd /Users/aomine/Desktop/stellar
./scripts/set-zkbs-verifier-testnet.sh <ZKBS_CONTRACT_ID> <VERIFIER_ROUTER_ID> <IMAGE_ID_HEX>
```

## Prover setup

Build prover binary:

```bash
cd /Users/aomine/Desktop/stellar
cargo build --release --manifest-path proofs/zk-battleship-risc0/host/Cargo.toml
```

Run standalone prover:

```bash
cd /Users/aomine/Desktop/stellar
cargo run --release --manifest-path proofs/zk-battleship-risc0/host/Cargo.toml -- \
  --input proofs/zk-battleship-risc0/example-input.json \
  --out /tmp/zkbs-proof.json
```

Output contains:

- `image_id_hex`
- `seal_hex`
- `journal_hex`

Docker must be running.

## Gameplay flows

### PvP flow

1. Player A creates invite (`start_game` auth entry).
2. Player B pastes invite and signs to submit `start_game`.
3. Both commit boards (`commit_board`).
4. Players take turns (relay handles move exchange).
5. Game ends locally when one side reaches required hits.
6. Each player clicks `Finalize on-chain` once:
   - signs `commit_transcript`,
   - submits board reveal payload to relay (`salt_hex` + `board_bits_hex`).
7. Relay builds canonical transcript, runs prover, submits `end_game`.
8. Contract verifies proof, validates journal bindings, and calls Game Hub `end_game`.

### PvC flow

Same as PvP, except:

- relay starts bot as Player 2,
- bot auto-commits board and transcript,
- relay auto-plays bot turns,
- settlement still follows same on-chain proof path.

## Rematch behavior

- Rematch unlocks after finalization reaches relay phase `done`.
- PvP rematch offer/accept flow runs via relay events.
- Some wallets do not support `signAuthEntry` required for accepting invite/rematch auth flows.
- Freighter is recommended for full rematch support.

## Relay event API (high-level)

Room/presence:

- `room:join`
- `room:state`
- `room:peer_joined`
- `room:peer_left`

Moves:

- `move:send`
- `move:recv`
- `move:result`

Settlement:

- `settle:get`
- `settle:commit_done`
- `settle:reveal`
- `settle:status`

Rematch:

- `rematch:offer`
- `rematch:cancel`
- `rematch:decline`
- `rematch:started`

Bot helpers:

- `bot:get_info`
- `bot:start_match`

## Settlement phases

Relay publishes `settle:status.phase`:

- `idle`
- `waiting_for_transcript`
- `waiting_for_commits`
- `waiting_for_reveals`
- `proving`
- `submitting`
- `done`
- `error`

The current implementation explicitly gates `proving/submitting` on transcript commit visibility on-chain to reduce finality races.

## Useful scripts

### End-to-end terminal simulation

```bash
cd /Users/aomine/Desktop/stellar
./scripts/simulate-terminal-match.sh
```

What it does:

- starts game (dual auth),
- constructs deterministic boards/transcript,
- commits board + transcript for both players,
- runs prover,
- submits `end_game`,
- fetches final session state.

### Dual-auth `start_game` helper

```bash
cd /Users/aomine/Desktop/stellar
node ./scripts/start-game-dual-auth.mjs
```

Used by simulator for explicit multi-auth start flow.

## Troubleshooting

### `txBadSeq`

Cause:
- wallet sequence consumed by another concurrent tx.

Current behavior:
- web retries simulation/send once, then shows retry message if still stale.

Action:
- retry once after a few seconds.

### `Transcript commit not visible on-chain yet`

Cause:
- Soroban RPC finality/indexing lag after `commit_transcript` submission.

Current behavior:
- relay waits/retries and verifies visibility before proceeding.

### `commit_transcript ... status=TRY_AGAIN_LATER` (especially PvC)

Cause:
- transient network submission pressure.

Current behavior:
- relay treats as transient and retries automatically.

### Brief `commit_transcript failed (status=FAILED)` flash in PvC

Cause:
- one bot commit attempt fails during race, next retry succeeds.

Current behavior:
- relay now checks on-chain digest visibility and suppresses false-hard failures when possible.

### `Finalize failed: Cannot read properties of undefined (reading 'switch')`

Cause:
- wallet/SDK auth introspection edge case.

Current behavior:
- web transaction helper includes workaround path and retry logic.

### `Failed to load resource ... _next/static/... 404`

Cause:
- stale Next.js dev assets/chunks after hot reload or server restart mismatch.

Action:
- hard refresh,
- if needed restart web dev server.

### Prover errors (`docker returned failure exit code`)

Cause:
- Docker not running or prover toolchain issue.

Action:
- start Docker,
- rebuild prover,
- retry settlement.

## Reliability and state model

- Relay keeps in-memory session/settlement state (not persistent DB).
- Session cleanup TTL is best-effort (`~2h`) for inactive sessions.
- On-chain contract state is source of truth for commitments/transcript/final settlement.

## Security and trust assumptions

- Commitment hiding relies on secret salts staying private until reveal.
- Relay is non-authoritative for proof validity; contract verification is authoritative.
- Relay can affect liveness/UX but cannot forge valid proof settlement without passing contract checks.
- Use separate funded accounts for relayer and bot where possible.

## Development status

Implemented:

- PvP and PvC gameplay loops.
- On-chain board and transcript commits.
- ZK proof settlement pipeline.
- Rematch support (with wallet capability caveats).
- Rich in-game settle status and retry handling for network finality races.

Known limitations:

- Relay state is ephemeral (memory only).
- Testnet/RPC latency can still delay phase transitions.
- Wallet feature support differs (not all support `signAuthEntry`).

## Additional docs

- Root task/spec: `/Users/aomine/Desktop/stellar/task.md`
- Contract notes: `/Users/aomine/Desktop/stellar/contracts/README.md`
- Relay notes: `/Users/aomine/Desktop/stellar/apps/relay/README.md`
- Prover notes: `/Users/aomine/Desktop/stellar/proofs/zk-battleship-risc0/README.md`

## License

No license file is currently present in this repository.
If you plan to publish broadly, add an explicit license (for example MIT or Apache-2.0).
