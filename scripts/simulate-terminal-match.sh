#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

NETWORK="${NETWORK:-testnet}"
SOROBAN_RPC_URL="${SOROBAN_RPC_URL:-https://soroban-testnet.stellar.org}"
NETWORK_PASSPHRASE="${NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"

CONTRACT_ID="${CONTRACT_ID:-zk-battleship}"
RELAYER_ALIAS="${RELAYER_ALIAS:-zkbs-deployer}"
P1_ALIAS="${P1_ALIAS:-zkbs-p1}"
P2_ALIAS="${P2_ALIAS:-zkbs-p2}"

MODE_ID="${MODE_ID:-0}" # 0=classic, 1=salvo (this script generates classic transcript)
P1_POINTS="${P1_POINTS:-10}"
P2_POINTS="${P2_POINTS:-10}"

PROVER_BIN="${PROVER_BIN:-${REPO_ROOT}/proofs/zk-battleship-risc0/target/release/zkbs-prover}"
GROTH16_SELECTOR_HEX="${GROTH16_SELECTOR_HEX:-73c457ba}"

SESSION_ID="${SESSION_ID:-$(date +%s)}"
RUN_DIR="${RUN_DIR:-/tmp/zkbs-sim-${SESSION_ID}}"

if [[ "${MODE_ID}" != "0" ]]; then
  echo "This simulator currently supports MODE_ID=0 (classic) only." >&2
  exit 1
fi

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

resolve_contract_id() {
  local raw="$1"
  if [[ "${raw}" =~ ^C[A-Z0-9]{55}$ ]]; then
    echo "${raw}"
    return 0
  fi

  stellar contract alias show "${raw}" --network "${NETWORK}" 2>/dev/null | head -n 1 | tr -d '[:space:]'
}

ensure_identity() {
  local alias="$1"
  if stellar keys public-key "${alias}" >/dev/null 2>&1; then
    return
  fi
  echo "Creating + funding identity ${alias} on ${NETWORK}..."
  stellar keys generate "${alias}" --network "${NETWORK}" --fund
}

need_cmd stellar
need_cmd node
mkdir -p "${RUN_DIR}"

ensure_identity "${P1_ALIAS}"
ensure_identity "${P2_ALIAS}"

CONTRACT_ID_RESOLVED="$(resolve_contract_id "${CONTRACT_ID}")"
if [[ ! "${CONTRACT_ID_RESOLVED}" =~ ^C[A-Z0-9]{55}$ ]]; then
  echo "Could not resolve CONTRACT_ID from '${CONTRACT_ID}'." >&2
  exit 1
fi

P1_PUB="$(stellar keys public-key "${P1_ALIAS}")"
P2_PUB="$(stellar keys public-key "${P2_ALIAS}")"

echo "Session: ${SESSION_ID}"
echo "P1: ${P1_ALIAS} (${P1_PUB})"
echo "P2: ${P2_ALIAS} (${P2_PUB})"
echo "Run artifacts: ${RUN_DIR}"

echo
echo "[1/7] start_game (dual-auth)"
START_GAME_JSON="$( \
  CONTRACT_ID="${CONTRACT_ID_RESOLVED}" \
  P1_ALIAS="${P1_ALIAS}" \
  P2_ALIAS="${P2_ALIAS}" \
  P1_PUB="${P1_PUB}" \
  P2_PUB="${P2_PUB}" \
  SESSION_ID="${SESSION_ID}" \
  MODE_ID="${MODE_ID}" \
  P1_POINTS="${P1_POINTS}" \
  P2_POINTS="${P2_POINTS}" \
  SOROBAN_RPC_URL="${SOROBAN_RPC_URL}" \
  NETWORK_PASSPHRASE="${NETWORK_PASSPHRASE}" \
  node "${SCRIPT_DIR}/start-game-dual-auth.mjs" \
)"
echo "${START_GAME_JSON}" | tee "${RUN_DIR}/start-game.json"
START_GAME_TX_HASH="$(echo "${START_GAME_JSON}" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);process.stdout.write(j.txHash||'');});")"

echo
echo "[2/7] Build deterministic boards + transcript (local play simulation)"
SIM_JSON="$(
  SESSION_ID="${SESSION_ID}" MODE_ID="${MODE_ID}" node --input-type=module -e '
    import crypto from "node:crypto";
    const sessionId = Number(process.env.SESSION_ID);
    const modeId = Number(process.env.MODE_ID || "0");

    const p1Ships = [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[0,1],[1,1]];
    const p2Ships = [[0,7],[1,7],[2,7],[3,7],[4,7],[5,7],[6,7],[7,7],[6,6],[7,6]];

    const p1Shots = [...p2Ships];
    const p2Shots = [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[7,7]];

    function boardBits(ships) {
      const bits = new Uint8Array(8);
      for (const [x, y] of ships) {
        const idx = y * 8 + x;
        bits[Math.floor(idx / 8)] |= (1 << (idx % 8));
      }
      return bits;
    }

    function has(ships, x, y) {
      return ships.some(([sx, sy]) => sx === x && sy === y);
    }

    const p1Bits = boardBits(p1Ships);
    const p2Bits = boardBits(p2Ships);
    const p1Salt = Buffer.from("11".repeat(32), "hex");
    const p2Salt = Buffer.from("22".repeat(32), "hex");

    const transcript = [];
    for (let turn = 0; turn < 19; turn += 1) {
      const attackerIsP1 = turn % 2 === 0;
      const i = Math.floor(turn / 2);
      const [x, y] = attackerIsP1 ? p1Shots[i] : p2Shots[i];
      const hit = attackerIsP1 ? (has(p2Ships, x, y) ? 1 : 0) : (has(p1Ships, x, y) ? 1 : 0);
      transcript.push(x, y, hit);
    }

    const transcriptBuf = Buffer.from(transcript);
    let p1Hits = 0;
    let p2Hits = 0;
    for (let i = 0; i < transcript.length / 3; i += 1) {
      const hit = transcript[i * 3 + 2];
      if (i % 2 === 0) p1Hits += hit;
      else p2Hits += hit;
    }

    const p1Commit = crypto.createHash("sha256").update(Buffer.concat([p1Salt, Buffer.from(p1Bits)])).digest("hex");
    const p2Commit = crypto.createHash("sha256").update(Buffer.concat([p2Salt, Buffer.from(p2Bits)])).digest("hex");
    const transcriptDigest = crypto.createHash("sha256").update(transcriptBuf).digest("hex");

    process.stdout.write(JSON.stringify({
      session_id: sessionId,
      mode_id: modeId,
      p1_salt_hex: p1Salt.toString("hex"),
      p1_board_bits_hex: Buffer.from(p1Bits).toString("hex"),
      p2_salt_hex: p2Salt.toString("hex"),
      p2_board_bits_hex: Buffer.from(p2Bits).toString("hex"),
      transcript_hex: transcriptBuf.toString("hex"),
      transcript_digest_hex: transcriptDigest,
      p1_commitment_hex: p1Commit,
      p2_commitment_hex: p2Commit,
      turns: transcript.length / 3,
      p1_hits: p1Hits,
      p2_hits: p2Hits,
      winner: p1Hits >= 10 ? "p1" : "p2"
    }, null, 2));
  '
)"
echo "${SIM_JSON}" | tee "${RUN_DIR}/sim.json"

SIM_TO_PROVER_JSON="$(echo "${SIM_JSON}" | node --input-type=module -e '
  let s = "";
  process.stdin.on("data", (d) => (s += d));
  process.stdin.on("end", () => {
    const x = JSON.parse(s);
    const out = {
      session_id: x.session_id,
      mode_id: x.mode_id,
      p1_salt_hex: x.p1_salt_hex,
      p1_board_bits_hex: x.p1_board_bits_hex,
      p2_salt_hex: x.p2_salt_hex,
      p2_board_bits_hex: x.p2_board_bits_hex,
      transcript_hex: x.transcript_hex,
    };
    process.stdout.write(JSON.stringify(out, null, 2));
  });
')"
echo "${SIM_TO_PROVER_JSON}" > "${RUN_DIR}/prover-input.json"

P1_COMMIT="$(echo "${SIM_JSON}" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);process.stdout.write(j.p1_commitment_hex);});")"
P2_COMMIT="$(echo "${SIM_JSON}" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);process.stdout.write(j.p2_commitment_hex);});")"
TRANSCRIPT_DIGEST="$(echo "${SIM_JSON}" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);process.stdout.write(j.transcript_digest_hex);});")"

echo
echo "[3/7] commit_board (both players)"
stellar contract invoke \
  --network "${NETWORK}" \
  --source "${P1_ALIAS}" \
  --id "${CONTRACT_ID_RESOLVED}" \
  --send=yes \
  -- \
  commit_board \
  --session_id "${SESSION_ID}" \
  --player "${P1_PUB}" \
  --commitment "${P1_COMMIT}" | tee "${RUN_DIR}/commit-board-p1.txt"

stellar contract invoke \
  --network "${NETWORK}" \
  --source "${P2_ALIAS}" \
  --id "${CONTRACT_ID_RESOLVED}" \
  --send=yes \
  -- \
  commit_board \
  --session_id "${SESSION_ID}" \
  --player "${P2_PUB}" \
  --commitment "${P2_COMMIT}" | tee "${RUN_DIR}/commit-board-p2.txt"

echo
echo "[4/7] commit_transcript (both players)"
stellar contract invoke \
  --network "${NETWORK}" \
  --source "${P1_ALIAS}" \
  --id "${CONTRACT_ID_RESOLVED}" \
  --send=yes \
  -- \
  commit_transcript \
  --session_id "${SESSION_ID}" \
  --player "${P1_PUB}" \
  --transcript_digest "${TRANSCRIPT_DIGEST}" | tee "${RUN_DIR}/commit-transcript-p1.txt"

stellar contract invoke \
  --network "${NETWORK}" \
  --source "${P2_ALIAS}" \
  --id "${CONTRACT_ID_RESOLVED}" \
  --send=yes \
  -- \
  commit_transcript \
  --session_id "${SESSION_ID}" \
  --player "${P2_PUB}" \
  --transcript_digest "${TRANSCRIPT_DIGEST}" | tee "${RUN_DIR}/commit-transcript-p2.txt"

echo
echo "[5/7] Run prover"
if [[ ! -x "${PROVER_BIN}" ]]; then
  echo "Prover binary not found/executable: ${PROVER_BIN}" >&2
  exit 1
fi
ZKBS_GROTH16_SELECTOR_HEX="${GROTH16_SELECTOR_HEX}" \
  "${PROVER_BIN}" \
  --input "${RUN_DIR}/prover-input.json" \
  --out "${RUN_DIR}/proof.json" | tee "${RUN_DIR}/prover-output.txt"

SEAL_HEX="$(node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync('${RUN_DIR}/proof.json','utf8'));process.stdout.write(j.seal_hex);")"
JOURNAL_HEX="$(node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync('${RUN_DIR}/proof.json','utf8'));process.stdout.write(j.journal_hex);")"

echo
echo "[6/7] end_game (finalize on-chain)"
END_GAME_OUT="$(
  stellar contract invoke \
    --network "${NETWORK}" \
    --source "${RELAYER_ALIAS}" \
    --id "${CONTRACT_ID_RESOLVED}" \
    --send=yes \
    -- \
    end_game \
    --session_id "${SESSION_ID}" \
    --seal "${SEAL_HEX}" \
    --journal "${JOURNAL_HEX}"
)"
echo "${END_GAME_OUT}" | tee "${RUN_DIR}/end-game.txt"

echo
echo "[7/7] Verify session state"
SESSION_JSON="$(
  stellar contract invoke \
    --network "${NETWORK}" \
    --source "${RELAYER_ALIAS}" \
    --id "${CONTRACT_ID_RESOLVED}" \
    --send=no \
    -- \
    get_session \
    --session_id "${SESSION_ID}"
)"
echo "${SESSION_JSON}" | tee "${RUN_DIR}/session.json"

echo
echo "Done."
echo "start_game tx: ${START_GAME_TX_HASH}"
echo "session_id: ${SESSION_ID}"
echo "expected local outcome: P1 win (P1 hits 10 / P2 hits 8)"
echo "artifacts:"
echo "  ${RUN_DIR}/sim.json"
echo "  ${RUN_DIR}/prover-input.json"
echo "  ${RUN_DIR}/proof.json"
echo "  ${RUN_DIR}/session.json"
