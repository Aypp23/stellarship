# Stellarship — Hackathon Submission Guide

## Project

Stellarship is a hidden-information naval strategy game on Stellar Testnet with proof-based settlement.

Players commit private board hashes, play the match, commit a transcript digest, and finalize via a RISC Zero Groth16 proof verified on-chain.

## Submission Requirements Mapping

### 1) ZK-powered mechanic

ZK is a core gameplay mechanic, not cosmetic:

- private board commitments (`sha256(salt || board_bits)`),
- transcript commitment by both players,
- proof-backed `end_game()` settlement validating winner + commitments + transcript digest consistency.

### 2) Deployed on-chain component

On-chain game contract: `contracts/zk-battleship`.

Required hub integration is implemented:

- `start_game(...)` calls Game Hub `start_game(...)`
- `end_game(...)` calls Game Hub `end_game(...)` after verification

Required Game Hub ID (from `task.md`):

- `CB4VZAT2U3UC6XFK3N23SKRF2NDCMP3QHJYMCHHFMZO7MRQO6DQ2EMYG`

### 3) Frontend

Frontend in `apps/web` provides:

- wallet connect,
- PvP and PvC (vs computer),
- match lobby and gameplay boards,
- finalize-on-chain UX with relayer status phases.

### 4) Open-source repository

This repository contains full source:

- web (`apps/web`),
- relay (`apps/relay`),
- contracts (`contracts/zk-battleship`),
- prover (`proofs/zk-battleship-risc0`),
- scripts (`scripts/*`).

## Architecture (high level)

- `apps/web`: player UX + wallet signatures
- `apps/relay`: realtime move relay + settlement orchestration + bot mode
- `contracts/zk-battleship`: on-chain commitments + proof-verified settlement
- `proofs/zk-battleship-risc0`: off-chain proof generation (`seal_hex`, `journal_hex`)
- verifier stack: router + Groth16 verifier contract

## End-to-end flow

1. `start_game` (dual-auth)
2. both players `commit_board`
3. play turns through relay
4. both players `commit_transcript`
5. relay gathers reveals + builds transcript
6. relay proves and submits `end_game`
7. contract verifies and settles via Game Hub

## Important contract checks

`end_game` validates:

- journal length/shape,
- `session_id` + `mode_id` match,
- journal commitments match on-chain committed boards,
- both transcript commits exist and match journal digest,
- Groth16 proof verifies for configured `image_id` via verifier router.

## How to run locally

From repo root:

```bash
cd /Users/aomine/Desktop/stellar
npm install
npm run dev:web
npm run dev:relay
```

- Web: `http://localhost:3000`
- Relay health: `http://localhost:3001/health`

Detailed setup is in `/Users/aomine/Desktop/stellar/README.md`.

## Fast verification scripts

### Deterministic terminal simulation

```bash
cd /Users/aomine/Desktop/stellar
./scripts/simulate-terminal-match.sh
```

This script executes full flow:

- start game,
- commit board + transcript,
- run prover,
- call `end_game`,
- print artifacts and resulting session state.

## Notes for judges

- PvP and PvC both use on-chain commitment + transcript + proof-based settlement.
- Final transaction hash shown in both clients is expected to match (single shared settlement tx per session).
- Relay is orchestration; contract verification is authoritative source of truth.

## Repo pointers

- Main docs: `/Users/aomine/Desktop/stellar/README.md`
- Operations runbook: `/Users/aomine/Desktop/stellar/OPERATIONS.md`
- Contract: `/Users/aomine/Desktop/stellar/contracts/zk-battleship/src/lib.rs`
- Relay: `/Users/aomine/Desktop/stellar/apps/relay/src/server.js`
- Web match scene: `/Users/aomine/Desktop/stellar/apps/web/src/components/MatchScene.tsx`
