# ZK Battleship RISC Zero Prover

This folder contains the **off-chain prover** for `contracts/zk-battleship` using **RISC Zero + Groth16**.

It produces the two values needed to call `end_game(session_id, seal, journal)`:
- `journal` (105 bytes): public output committed by the guest
- `seal` (260 bytes): Groth16 proof bytes prefixed with the verifier selector (`0x73c457ba`)

Before calling `end_game`, **both players must also commit the transcript digest on-chain** via
`commit_transcript(session_id, player, transcript_digest)` (the contract checks it matches the journal).

## Prereqs
- Rust toolchain
- Docker (daemon running)
- RISC Zero toolchain (recommended):
  - Install: `curl -L https://risczero.com/install | bash`
  - Then: `rzup install`

## Input Format
The host binary reads a JSON file:
```json
{
  "session_id": 42,
  "mode_id": 0,
  "p1_salt_hex": "…64 hex chars…",
  "p1_board_bits_hex": "…16 hex chars…",
  "p2_salt_hex": "…64 hex chars…",
  "p2_board_bits_hex": "…16 hex chars…",
  "transcript_hex": "…hex…"
}
```

Notes:
- `board_bits_hex` is the 8-byte packed board bitset (same encoding as the frontend).
- `transcript_hex` is the transcript bytes shown in the Match UI as `(x,y,hit)` triples.

## Run
From repo root:
```bash
cargo run --release --manifest-path proofs/zk-battleship-risc0/host/Cargo.toml -- \
  --input proofs/zk-battleship-risc0/example-input.json \
  --out /tmp/zkbs-proof.json
```

The output JSON includes:
- `image_id_hex` (32 bytes) for configuring the on-chain contract
- `journal_hex` (105 bytes) to paste into the UI
- `seal_hex` (260 bytes) to paste into the UI

## Selector Override

The host prefixes Groth16 seals with a 4-byte selector for router dispatch.

- Default: `73c457ba`
- Override with env var:

```bash
ZKBS_GROTH16_SELECTOR_HEX=<8-hex> cargo run --release --manifest-path proofs/zk-battleship-risc0/host/Cargo.toml -- \
  --input proofs/zk-battleship-risc0/example-input.json \
  --out /tmp/zkbs-proof.json
```
