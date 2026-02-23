# Contracts

This folder contains the Soroban smart contracts for the hackathon game.

## Prereqs
- Rust toolchain (stable)
- Stellar CLI (includes Soroban tooling)

## Build (example)
```bash
cd contracts
cargo build --release
```

## Notes
- `contracts/zk-battleship` implements `start_game(session_id, mode_id, ...)` with on-chain enforced `mode_id`
  by including it in `require_auth_for_args`.
- `end_game(session_id, seal, journal)` verifies a RISC Zero Groth16 receipt via the deployed verifier router
  and then calls the Game Hub `end_game()`.
- Both players must call `commit_transcript(session_id, player, transcript_digest)` before `end_game` can succeed.
