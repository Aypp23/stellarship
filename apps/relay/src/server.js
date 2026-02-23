import http from 'node:http';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Server } from 'socket.io';
import {
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  Networks,
  TransactionBuilder,
  authorizeEntry,
  nativeToScVal,
  rpc,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk';

const PORT = Number(process.env.PORT || 3001);

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

function roomId(sessionId) {
  return `session:${sessionId}`;
}

const execFileAsync = promisify(execFile);
const GRID_SIZE = 8;
const SHIP_CELLS = 10;
const SMART_SHIP_LENGTHS = [4, 3, 3];
const MAX_SHIP_MODEL_SOLUTIONS = 40_000;
const SHIP_PLACEMENT_CACHE = new Map();
const OPPONENT_SHOT_HEAT = new Map();
const GLOBAL_SHOT_HEAT_KEY = '*';

function nowMs() {
  return Date.now();
}

function cleanHex(s) {
  return String(s ?? '')
    .trim()
    .replace(/^0x/i, '')
    .replace(/[^0-9a-f]/gi, '')
    .toLowerCase();
}

function sha256Hex(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function scValToText(v) {
  if (!v) return '';
  try {
    const sw = v.switch().name;
    if (sw === 'scvSymbol') return Buffer.from(v.sym()).toString('utf8');
    if (sw === 'scvString') return Buffer.from(v.str()).toString('utf8');
    if (sw === 'scvAddress') return Address.fromScAddress(v.address()).toString();
    if (sw === 'scvError') {
      const e = v.error();
      return `Error(${e.type().name}, #${e.code()})`;
    }
    if (sw === 'scvU32') return String(v.u32());
    if (sw === 'scvU64') return String(v.u64().toString());
    return sw;
  } catch {
    return '';
  }
}

function summarizeDiagnosticErrors(final, maxLines = 4) {
  const events = Array.isArray(final?.diagnosticEventsXdr)
    ? final.diagnosticEventsXdr
    : Array.isArray(final?.diagnosticEvents)
      ? final.diagnosticEvents
      : null;
  if (!events) return '';
  const lines = [];

  for (const ev of events) {
    try {
      const body = ev.event().body().v0();
      const topics = body.topics();
      const data = body.data();
      const topicText = topics.map((t) => scValToText(t)).join(', ');
      const dataText = scValToText(data);
      if (!topicText.includes('error') && !topicText.includes('fn_call')) continue;
      lines.push(`${topicText}: ${dataText}`);
      if (lines.length >= maxLines) break;
    } catch {
      // ignore malformed diagnostic entries
    }
  }

  return lines.join(' | ');
}

async function waitForFinalStatus(server, hash, maxAttempts = 240) {
  let last = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      last = await server.getTransaction(hash);
    } catch {
      // tolerate transient RPC errors and retry
    }

    const status = String(last?.status ?? '');
    if (status === 'SUCCESS' || status === 'FAILED') return last;

    // Poll with capped backoff; Soroban Testnet can take longer under load.
    const waitMs = Math.min(4500, 700 + attempt * 30);
    await sleep(waitMs);
  }
  return last;
}

function summarizeSendError(method, sent) {
  const status = String(sent?.status ?? 'UNKNOWN');
  const txHash = String(sent?.hash ?? '');
  let details = '';
  try {
    if (sent?.errorResult) details = ` tx_result=${sent.errorResult.result().switch().name}`;
  } catch {
    // ignore decode edge-cases
  }
  const diag = summarizeDiagnosticErrors(sent);
  return `${method} submit failed (status=${status})${txHash ? ` hash=${txHash}` : ''}${details}${diag ? ` ${diag}` : ''}`;
}

function isTransientRelayCommitError(message) {
  const msg = String(message ?? '').toLowerCase();
  return (
    msg.includes('status=try_again_later') ||
    msg.includes('status=duplicate') ||
    msg.includes('status=not_found') ||
    msg.includes('commit_transcript failed (status=failed)') ||
    msg.includes('txbadseq') ||
    msg.includes('relay request timed out') ||
    msg.includes('temporarily unavailable')
  );
}

function digestHexFromScValue(v) {
  if (!v) return '';
  if (Buffer.isBuffer(v) || v instanceof Uint8Array) {
    const hex = Buffer.from(v).toString('hex');
    return cleanHex(hex);
  }
  return cleanHex(v);
}

async function fetchOnChainTranscriptDigests(cfg, sessionId) {
  if (!cfg?.contractId) return null;
  const sid = tryParseU32(sessionId);
  if (sid === null) return null;

  const readSecret = String(cfg.relayerSecret || cfg.botSecret || '').trim();
  if (!readSecret) return null;
  const readAddress = Keypair.fromSecret(readSecret).publicKey();

  const server = new rpc.Server(cfg.rpcUrl, { allowHttp: cfg.rpcUrl.startsWith('http://') });
  const account = await server.getAccount(readAddress);
  const contract = new Contract(cfg.contractId);

  const tx = new TransactionBuilder(account, {
    fee: String(BASE_FEE),
    networkPassphrase: cfg.networkPassphrase,
  })
    .addOperation(contract.call('get_session', nativeToScVal(sid, { type: 'u32' })))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (sim?.error || !sim?.result?.retval) return null;

  const native = scValToNative(sim.result.retval);
  if (!native || typeof native !== 'object') return null;

  const p1 = digestHexFromScValue(native.player1_transcript_digest ?? native.player1TranscriptDigest);
  const p2 = digestHexFromScValue(native.player2_transcript_digest ?? native.player2TranscriptDigest);
  return { p1, p2 };
}

function tryParseU32(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x < 0 || x > 0xffff_ffff) return null;
  return Math.floor(x);
}

function defaultProverBin() {
  const env = String(process.env.ZKBS_PROVER_BIN || '').trim();
  if (env) return env;

  // Support running from repo root or from apps/relay.
  const candidates = [
    path.resolve(process.cwd(), 'proofs/zk-battleship-risc0/target/release/zkbs-prover'),
    path.resolve(process.cwd(), '../../proofs/zk-battleship-risc0/target/release/zkbs-prover'),
  ];
  const cwd = process.cwd();
  if (cwd.includes(`${path.sep}apps${path.sep}relay`)) return candidates[1];
  return candidates[0];
}

function parsePositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function getRelayConfig() {
  const rpcUrl =
    process.env.SOROBAN_RPC_URL ||
    process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ||
    'https://soroban-testnet.stellar.org';
  const networkPassphrase =
    process.env.NETWORK_PASSPHRASE ||
    process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ||
    Networks.TESTNET;
  const contractId =
    process.env.ZK_BATTLESHIP_CONTRACT_ID ||
    process.env.NEXT_PUBLIC_ZK_BATTLESHIP_CONTRACT_ID ||
    process.env.CONTRACT_ID ||
    '';
  const relayerSecret = process.env.RELAYER_SECRET_KEY || '';
  const botSecret = process.env.BOT_SECRET_KEY || process.env.ZKBS_BOT_SECRET_KEY || relayerSecret || '';
  const proverBin = defaultProverBin();
  const proverBackend = String(process.env.ZKBS_PROVER_BACKEND || 'auto')
    .trim()
    .toLowerCase();
  const githubToken = String(process.env.GITHUB_TOKEN || process.env.ZKBS_GITHUB_TOKEN || '').trim();
  const githubRepo = String(process.env.GITHUB_REPO || process.env.ZKBS_GITHUB_REPO || '').trim();
  const githubWorkflow = String(
    process.env.GITHUB_WORKFLOW || process.env.ZKBS_GITHUB_WORKFLOW || 'zkbs-prover.yml'
  ).trim();
  const githubWorkflowRef = String(
    process.env.GITHUB_WORKFLOW_REF || process.env.ZKBS_GITHUB_WORKFLOW_REF || 'main'
  ).trim();
  const githubPollMs = parsePositiveInt(
    process.env.GITHUB_PROVER_POLL_MS || process.env.ZKBS_GITHUB_PROVER_POLL_MS,
    2500
  );
  const githubTimeoutMs = parsePositiveInt(
    process.env.GITHUB_PROVER_TIMEOUT_MS || process.env.ZKBS_GITHUB_PROVER_TIMEOUT_MS,
    20 * 60 * 1000
  );
  return {
    rpcUrl,
    networkPassphrase,
    contractId,
    relayerSecret,
    botSecret,
    proverBin,
    proverBackend,
    githubToken,
    githubRepo,
    githubWorkflow,
    githubWorkflowRef,
    githubPollMs,
    githubTimeoutMs,
  };
}

const sessions = new Map();
const rematchOffers = new Map();
const REMATCH_OFFER_TTL_MS = 5 * 60 * 1000;

function getPendingRematchOffer(sessionId) {
  const sid = String(sessionId);
  const offer = rematchOffers.get(sid);
  if (!offer) return null;
  if (Number(offer.expiresAt ?? 0) <= nowMs()) {
    rematchOffers.delete(sid);
    return null;
  }
  return offer;
}

function putPendingRematchOffer(sessionId, offer) {
  rematchOffers.set(String(sessionId), offer);
}

function clearPendingRematchOffer(sessionId) {
  rematchOffers.delete(String(sessionId));
}

function getOrCreateSessionState(sessionId) {
  const sid = String(sessionId);
  let s = sessions.get(sid);
  if (!s) {
    s = {
      sessionId: sid,
      lastUpdatedAt: nowMs(),
      modeId: null,
      shotsPerTurn: null,
      // Turn-indexed message capture.
      movesByTurn: new Map(), // turn -> { attacker, shots }
      resultsByTurn: new Map(), // turn -> { defender, results }
      transcriptHex: '',
      transcriptDigestHex: '',
      // Settlement: keyed by role to avoid ambiguity.
      settle: {
        phase: 'idle',
        phaseUpdatedAt: nowMs(),
        statusVersion: 0,
        p1: { address: null, commitDone: false, digestHex: null, reveal: null },
        p2: { address: null, commitDone: false, digestHex: null, reveal: null },
        proof: null,
        txHash: null,
        error: null,
        inProgress: false,
        retryTimer: null,
      },
      bot: {
        enabled: false,
        address: null,
        saltHex: '',
        boardBitsHex: '',
        commitmentHex: '',
        occupied: new Set(),
        fired: new Set(),
        transcriptCommittedOnChain: false,
        transcriptRetryTimer: null,
      },
    };
    sessions.set(sid, s);
  }
  return s;
}

function toCoordIdx(x, y) {
  return y * GRID_SIZE + x;
}

function fromCoordIdx(idx) {
  return { x: idx % GRID_SIZE, y: Math.floor(idx / GRID_SIZE) };
}

function coordKey(x, y) {
  return `${x}:${y}`;
}

function randomSaltHex32() {
  return crypto.randomBytes(32).toString('hex');
}

function toHeatKey(address) {
  const clean = String(address ?? '').trim().toLowerCase();
  return clean || GLOBAL_SHOT_HEAT_KEY;
}

function getShotHeatBucket(address) {
  const key = toHeatKey(address);
  let bucket = OPPONENT_SHOT_HEAT.get(key);
  if (!bucket) {
    bucket = new Uint32Array(GRID_SIZE * GRID_SIZE);
    OPPONENT_SHOT_HEAT.set(key, bucket);
  }
  return bucket;
}

function rememberOpponentShots(address, shots) {
  const key = toHeatKey(address);
  if (!key || key === GLOBAL_SHOT_HEAT_KEY) return;
  if (!Array.isArray(shots) || shots.length === 0) return;

  const mine = getShotHeatBucket(key);
  const global = getShotHeatBucket(GLOBAL_SHOT_HEAT_KEY);
  const seen = new Set();

  for (const s of shots) {
    const x = Number(s?.x ?? -1);
    const y = Number(s?.y ?? -1);
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) continue;
    const idx = toCoordIdx(x, y);
    if (seen.has(idx)) continue;
    seen.add(idx);
    mine[idx] += 1;
    global[idx] += 1;
  }
}

function buildOpponentShotRisk(opponentAddress) {
  const me = OPPONENT_SHOT_HEAT.get(toHeatKey(opponentAddress));
  const global = OPPONENT_SHOT_HEAT.get(GLOBAL_SHOT_HEAT_KEY);
  const risk = new Array(GRID_SIZE * GRID_SIZE).fill(0);

  let total = 0;
  const cx = (GRID_SIZE - 1) / 2;
  const cy = (GRID_SIZE - 1) / 2;
  for (let idx = 0; idx < risk.length; idx += 1) {
    const { x, y } = fromCoordIdx(idx);
    const dCenter = Math.abs(x - cx) + Math.abs(y - cy);
    const ring = Math.min(x, GRID_SIZE - 1 - x, y, GRID_SIZE - 1 - y);

    // Prior for likely human fire tendencies: center bias + mild parity habit.
    const prior = 1 + Math.max(0, 4.1 - dCenter) * 0.55 + ring * 0.07 + ((x + y) % 2 === 0 ? 0.16 : 0);
    const oppCount = me ? me[idx] : 0;
    const globalCount = global ? global[idx] : 0;
    const value = prior + oppCount * 1.95 + globalCount * 0.24;
    risk[idx] = value;
    total += value;
  }

  if (total <= 0) return risk.map(() => 1 / risk.length);
  return risk.map((v) => v / total);
}

function weightedPick(weights, forbidden) {
  let total = 0;
  for (let i = 0; i < weights.length; i += 1) {
    if (forbidden.has(i)) continue;
    total += Math.max(0, Number(weights[i] ?? 0));
  }
  if (total <= 0) return -1;

  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i += 1) {
    if (forbidden.has(i)) continue;
    r -= Math.max(0, Number(weights[i] ?? 0));
    if (r <= 0) return i;
  }
  return -1;
}

function pickRandomFreeIndex(forbidden) {
  const free = [];
  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i += 1) {
    if (!forbidden.has(i)) free.push(i);
  }
  if (free.length === 0) return -1;
  return free[Math.floor(Math.random() * free.length)];
}

function sampleBoardFromRisk(risk) {
  const chosen = [];
  const used = new Set();
  const weights = risk.map((v) => Math.pow(Math.max(1e-6, 1 - v), 2.25));

  while (chosen.length < SHIP_CELLS) {
    let idx = weightedPick(weights, used);
    if (idx < 0) idx = pickRandomFreeIndex(used);
    if (idx < 0) break;

    chosen.push(idx);
    used.add(idx);

    // Repel nearby picks so boards are harder to infer from local probing.
    const p = fromCoordIdx(idx);
    for (let j = 0; j < weights.length; j += 1) {
      if (used.has(j)) continue;
      const q = fromCoordIdx(j);
      const md = Math.abs(p.x - q.x) + Math.abs(p.y - q.y);
      if (md === 1) weights[j] *= 0.18;
      else if (md === 2) weights[j] *= 0.52;
      else if (p.x === q.x || p.y === q.y) weights[j] *= 0.9;
    }
  }

  return chosen;
}

function scoreBoardCandidate(indices, risk) {
  if (!Array.isArray(indices) || indices.length !== SHIP_CELLS) return -Infinity;

  let cumulativeRisk = 0;
  let pairDistance = 0;
  let adjacentPairs = 0;
  let nearPairs = 0;
  const rowCounts = new Array(GRID_SIZE).fill(0);
  const colCounts = new Array(GRID_SIZE).fill(0);
  const quadrants = [0, 0, 0, 0];

  for (let i = 0; i < indices.length; i += 1) {
    const aIdx = indices[i];
    const a = fromCoordIdx(aIdx);
    cumulativeRisk += Number(risk[aIdx] ?? 0);
    rowCounts[a.y] += 1;
    colCounts[a.x] += 1;

    const q = (a.y < GRID_SIZE / 2 ? 0 : 2) + (a.x < GRID_SIZE / 2 ? 0 : 1);
    quadrants[q] += 1;

    for (let j = i + 1; j < indices.length; j += 1) {
      const b = fromCoordIdx(indices[j]);
      const dx = Math.abs(a.x - b.x);
      const dy = Math.abs(a.y - b.y);
      const md = dx + dy;
      pairDistance += md;
      if (md === 1) adjacentPairs += 1;
      if (Math.max(dx, dy) === 1) nearPairs += 1;
    }
  }

  const pairs = (SHIP_CELLS * (SHIP_CELLS - 1)) / 2;
  const spread = pairDistance / pairs;
  const rowPenalty = rowCounts.reduce((acc, c) => acc + Math.max(0, c - 2) ** 2, 0);
  const colPenalty = colCounts.reduce((acc, c) => acc + Math.max(0, c - 2) ** 2, 0);
  const quadrantPenalty = quadrants.reduce((acc, c) => acc + Math.abs(c - SHIP_CELLS / 4), 0);
  const diversityBonus = rowCounts.filter((c) => c > 0).length + colCounts.filter((c) => c > 0).length;

  return (
    spread * 1.75 +
    diversityBonus * 0.11 -
    cumulativeRisk * 44 -
    adjacentPairs * 2.8 -
    nearPairs * 0.55 -
    rowPenalty * 1.3 -
    colPenalty * 1.3 -
    quadrantPenalty * 0.6
  );
}

function optimizeBoardCandidate(initial, risk, rounds = 40) {
  if (!Array.isArray(initial) || initial.length !== SHIP_CELLS) return initial;
  let current = initial.slice();
  let currentScore = scoreBoardCandidate(current, risk);
  let best = current.slice();
  let bestScore = currentScore;

  for (let step = 0; step < rounds; step += 1) {
    const used = new Set(current);
    const removeAt = Math.floor(Math.random() * current.length);
    const removed = current[removeAt];
    used.delete(removed);

    const replacementWeights = risk.map((v, idx) =>
      used.has(idx) ? 0 : Math.pow(Math.max(1e-6, 1 - v), 2.1)
    );
    let replacement = weightedPick(replacementWeights, used);
    if (replacement < 0) replacement = pickRandomFreeIndex(used);
    if (replacement < 0) continue;

    const candidate = current.slice();
    candidate[removeAt] = replacement;
    const candidateScore = scoreBoardCandidate(candidate, risk);
    const temperature = Math.max(0.04, 0.58 * (1 - step / rounds));
    const accept =
      candidateScore >= currentScore ||
      Math.random() < Math.exp((candidateScore - currentScore) / temperature);

    if (!accept) continue;
    current = candidate;
    currentScore = candidateScore;
    if (candidateScore > bestScore) {
      best = candidate.slice();
      bestScore = candidateScore;
    }
  }

  return best;
}

function generateDefensiveBoard(opponentAddress = '') {
  const all = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => i);
  const risk = buildOpponentShotRisk(opponentAddress);
  let best = null;
  let bestScore = -Infinity;

  for (let run = 0; run < 220; run += 1) {
    const seed = sampleBoardFromRisk(risk);
    if (seed.length !== SHIP_CELLS) continue;
    const candidate = optimizeBoardCandidate(seed, risk, 36);
    const score = scoreBoardCandidate(candidate, risk) + Math.random() * 0.015;
    if (score > bestScore) {
      bestScore = score;
      best = candidate.slice();
    }
  }

  const picks = best ?? all.sort(() => Math.random() - 0.5).slice(0, SHIP_CELLS);
  const bits = Buffer.alloc(8, 0);
  const occupied = new Set();
  for (const idx of picks) {
    const { x, y } = fromCoordIdx(idx);
    bits[Math.floor(idx / 8)] |= 1 << (idx % 8);
    occupied.add(coordKey(x, y));
  }
  return { boardBitsHex: bits.toString('hex'), occupied };
}

function buildBoardCommitmentHex(saltHex, boardBitsHex) {
  const salt = Buffer.from(cleanHex(saltHex), 'hex');
  const bits = Buffer.from(cleanHex(boardBitsHex), 'hex');
  return sha256Hex(Buffer.concat([salt, bits]));
}

function getShipPlacementsByLength(length) {
  const key = String(length);
  const cached = SHIP_PLACEMENT_CACHE.get(key);
  if (cached) return cached;

  const placements = [];
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      if (x + length <= GRID_SIZE) {
        const cells = [];
        let mask = 0n;
        for (let i = 0; i < length; i += 1) {
          const idx = toCoordIdx(x + i, y);
          cells.push(idx);
          mask |= 1n << BigInt(idx);
        }
        placements.push({ cells, mask });
      }
      if (y + length <= GRID_SIZE) {
        const cells = [];
        let mask = 0n;
        for (let i = 0; i < length; i += 1) {
          const idx = toCoordIdx(x, y + i);
          cells.push(idx);
          mask |= 1n << BigInt(idx);
        }
        placements.push({ cells, mask });
      }
    }
  }
  SHIP_PLACEMENT_CACHE.set(key, placements);
  return placements;
}

function collectBotObservations(session) {
  const botAddr = String(session?.bot?.address ?? '');
  const hits = new Set();
  const misses = new Set();
  const fired = new Set();

  const turns = Array.from(session.movesByTurn.keys())
    .filter((t) => session.resultsByTurn.has(t))
    .sort((a, b) => a - b);

  for (const turn of turns) {
    const move = session.movesByTurn.get(turn);
    const result = session.resultsByTurn.get(turn);
    if (!move || !result) continue;
    if (String(move.attacker ?? '') !== botAddr) continue;
    if (!Array.isArray(move.shots) || !Array.isArray(result.results)) continue;
    const n = Math.min(move.shots.length, result.results.length);
    for (let i = 0; i < n; i += 1) {
      const s = move.shots[i];
      const r = result.results[i];
      const x = Number(s?.x ?? -1);
      const y = Number(s?.y ?? -1);
      if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) continue;
      const idx = toCoordIdx(x, y);
      fired.add(idx);
      if (r?.hit) hits.add(idx);
      else misses.add(idx);
    }
  }

  return { hits, misses, fired };
}

function scoreCellsByShipModel(observations) {
  const { hits, misses, fired } = observations;
  const missesMask = Array.from(misses).reduce((m, idx) => m | (1n << BigInt(idx)), 0n);
  const hitsMask = Array.from(hits).reduce((m, idx) => m | (1n << BigInt(idx)), 0n);
  const firedMask = Array.from(fired).reduce((m, idx) => m | (1n << BigInt(idx)), 0n);

  const placementSets = SMART_SHIP_LENGTHS.map((len) =>
    getShipPlacementsByLength(len).filter((p) => (p.mask & missesMask) === 0n)
  );

  const usage = new Array(GRID_SIZE * GRID_SIZE).fill(0);
  const chosen = new Array(SMART_SHIP_LENGTHS.length);
  let solutions = 0;

  const dfs = (depth, usedMask, coveredHitsMask) => {
    if (solutions >= MAX_SHIP_MODEL_SOLUTIONS) return;
    if (depth === SMART_SHIP_LENGTHS.length) {
      if ((coveredHitsMask & hitsMask) !== hitsMask) return;
      solutions += 1;
      for (let i = 0; i < chosen.length; i += 1) {
        const p = chosen[i];
        if (!p) continue;
        for (const idx of p.cells) {
          if (((firedMask >> BigInt(idx)) & 1n) === 1n) continue;
          usage[idx] += 1;
        }
      }
      return;
    }

    for (const p of placementSets[depth]) {
      if ((p.mask & usedMask) !== 0n) continue;
      chosen[depth] = p;
      dfs(depth + 1, usedMask | p.mask, coveredHitsMask | p.mask);
      chosen[depth] = null;
      if (solutions >= MAX_SHIP_MODEL_SOLUTIONS) return;
    }
  };

  dfs(0, 0n, 0n);
  if (solutions === 0) return null;
  return usage.map((v) => v / solutions);
}

function scoreCellsByHeuristic(observations) {
  const { hits, misses, fired } = observations;
  const scores = new Array(GRID_SIZE * GRID_SIZE).fill(-Infinity);
  const firedCount = fired.size;
  const earlyGame = firedCount < 24;

  const hasHit = (x, y) => hits.has(toCoordIdx(x, y));
  const hasMiss = (x, y) => misses.has(toCoordIdx(x, y));

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const idx = toCoordIdx(x, y);
      if (fired.has(idx)) continue;

      let score = 1;
      const cx = (GRID_SIZE - 1) / 2;
      const cy = (GRID_SIZE - 1) / 2;
      const dCenter = Math.abs(x - cx) + Math.abs(y - cy);
      score += (5 - dCenter) * 0.26;

      if (earlyGame) {
        score += (x + y) % 2 === 0 ? 0.35 : 0;
      }

      const orth = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ];
      const diag = [
        [x + 1, y + 1],
        [x - 1, y + 1],
        [x + 1, y - 1],
        [x - 1, y - 1],
      ];

      for (const [nx, ny] of orth) {
        if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
        if (hasHit(nx, ny)) score += 4.2;
        if (hasMiss(nx, ny)) score -= 0.55;
      }

      for (const [nx, ny] of diag) {
        if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
        if (hasHit(nx, ny)) score += 0.85;
      }

      // Prefer extending visible hit lines.
      if (hasHit(x - 1, y) && hasHit(x + 1, y)) score += 2.8;
      if (hasHit(x, y - 1) && hasHit(x, y + 1)) score += 2.8;
      if (hasHit(x - 1, y) || hasHit(x + 1, y)) score += 1.2;
      if (hasHit(x, y - 1) || hasHit(x, y + 1)) score += 1.2;

      scores[idx] = score;
    }
  }

  return scores;
}

function pickSmartBotShots(session, shotsPerTurn) {
  const observations = collectBotObservations(session);
  const modelScores = scoreCellsByShipModel(observations);
  const fallbackScores = scoreCellsByHeuristic(observations);
  const scored = [];

  for (let idx = 0; idx < GRID_SIZE * GRID_SIZE; idx += 1) {
    if (observations.fired.has(idx)) continue;
    const base = modelScores && Number.isFinite(modelScores[idx]) ? modelScores[idx] * 12 : fallbackScores[idx];
    const jitter = Math.random() * 0.06;
    scored.push({ idx, score: base + jitter });
  }

  scored.sort((a, b) => b.score - a.score);
  const picks = scored.slice(0, Math.max(1, shotsPerTurn)).map((x) => fromCoordIdx(x.idx));
  return picks;
}

function getScore(session) {
  const p1 = String(session.settle?.p1?.address ?? '');
  const p2 = String(session.settle?.p2?.address ?? '');
  let p1Hits = 0;
  let p2Hits = 0;
  const hitsByAttacker = new Map();

  const turns = Array.from(session.movesByTurn.keys())
    .filter((t) => session.resultsByTurn.has(t))
    .sort((a, b) => a - b);

  for (const t of turns) {
    const move = session.movesByTurn.get(t);
    const res = session.resultsByTurn.get(t);
    if (!move || !res) continue;
    const attacker = String(move.attacker ?? '');
    const hits = Array.isArray(res.results) ? res.results.filter((r) => !!r?.hit).length : 0;
    if (attacker) hitsByAttacker.set(attacker, (hitsByAttacker.get(attacker) ?? 0) + hits);
    if (attacker === p1) p1Hits += hits;
    else if (attacker === p2) p2Hits += hits;
  }

  const leaderHits = Math.max(0, ...hitsByAttacker.values());
  return { p1Hits, p2Hits, leaderHits };
}

function isMatchComplete(session) {
  const { leaderHits } = getScore(session);
  return leaderHits >= SHIP_CELLS;
}

function parseStartGameAuthEntry(authEntryXdr) {
  const authEntry = xdr.SorobanAuthorizationEntry.fromXDR(String(authEntryXdr ?? ''), 'base64');
  const creds = authEntry.credentials();
  const p1Address = Address.fromScAddress(creds.address().address()).toString();
  const contractFn = authEntry.rootInvocation().function().contractFn();
  const functionName = contractFn.functionName().toString();
  if (functionName !== 'start_game') {
    throw new Error(`Unexpected function in auth entry: ${functionName}`);
  }
  const args = contractFn.args();
  if (!args || args.length !== 3) {
    throw new Error(`Expected 3 auth args for start_game, got ${args?.length ?? 0}`);
  }

  const sessionId = args[0].u32();
  const modeId = args[1].u32();
  const player1Points = args[2].i128().lo().toBigInt();

  return { sessionId, modeId, player1: p1Address, player1Points };
}

async function submitContractTxWithSigner(cfg, signerKp, method, args, feeMultiplier = 1000) {
  if (!cfg.contractId) throw new Error('Missing ZK_BATTLESHIP_CONTRACT_ID');
  const server = new rpc.Server(cfg.rpcUrl, { allowHttp: cfg.rpcUrl.startsWith('http://') });
  const account = await server.getAccount(signerKp.publicKey());

  const contract = new Contract(cfg.contractId);
  const op = contract.call(method, ...args);

  const tx = new TransactionBuilder(account, {
    fee: String(Number(BASE_FEE) * feeMultiplier),
    networkPassphrase: cfg.networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(60)
    .build();

  const prepared = await server.prepareTransaction(tx);
  prepared.sign(signerKp);
  const sent = await server.sendTransaction(prepared);
  if (!sent?.hash) throw new Error(`${method} failed: RPC did not return a tx hash`);
  if (sent.status && String(sent.status) !== 'PENDING') {
    throw new Error(summarizeSendError(method, sent));
  }

  const final = await waitForFinalStatus(server, sent.hash, 240);
  const finalStatus = String(final?.status ?? 'NOT_FOUND');
  if (finalStatus !== 'SUCCESS') {
    const diag = summarizeDiagnosticErrors(final);
    throw new Error(`${method} failed (status=${finalStatus})${diag ? ` ${diag}` : ''}`);
  }

  return sent.hash;
}

async function startGameAsBotFromAuth(authEntryXdr, cfg) {
  if (!cfg.contractId) throw new Error('Missing ZK_BATTLESHIP_CONTRACT_ID');
  if (!cfg.botSecret) throw new Error('Missing BOT_SECRET_KEY');

  const parsed = parseStartGameAuthEntry(authEntryXdr);
  const botKp = Keypair.fromSecret(cfg.botSecret);
  const botAddress = botKp.publicKey();
  if (parsed.player1 === botAddress) {
    throw new Error('Bot address matches Player 1 address. Use a different wallet or set BOT_SECRET_KEY to a distinct account.');
  }
  const player1SignedAuth = xdr.SorobanAuthorizationEntry.fromXDR(authEntryXdr, 'base64');

  const server = new rpc.Server(cfg.rpcUrl, { allowHttp: cfg.rpcUrl.startsWith('http://') });
  const account = await server.getAccount(botAddress);
  const contract = new Contract(cfg.contractId);

  const op = contract.call(
    'start_game',
    nativeToScVal(parsed.sessionId, { type: 'u32' }),
    nativeToScVal(parsed.modeId, { type: 'u32' }),
    nativeToScVal(parsed.player1, { type: 'address' }),
    nativeToScVal(botAddress, { type: 'address' }),
    nativeToScVal(parsed.player1Points, { type: 'i128' }),
    nativeToScVal(0n, { type: 'i128' })
  );

  const tx = new TransactionBuilder(account, {
    fee: String(BASE_FEE),
    networkPassphrase: cfg.networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(60)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (sim.error) throw new Error(`start_game simulation failed: ${sim.error}`);

  const prepared = rpc.assembleTransaction(tx, sim).build();
  const auth = prepared.operations?.[0]?.auth || [];
  if (!auth.length) throw new Error('start_game simulation returned no auth entries');

  let replacedP1 = false;
  const latest = await server.getLatestLedger();
  const validUntilLedger = Number(latest.sequence) + 1000;

  for (let i = 0; i < auth.length; i += 1) {
    const entry = auth[i];
    const credType = entry.credentials().switch().name;
    if (credType !== 'sorobanCredentialsAddress') continue;
    const entryAddress = Address.fromScAddress(entry.credentials().address().address()).toString();
    if (entryAddress === parsed.player1) {
      auth[i] = player1SignedAuth;
      replacedP1 = true;
      continue;
    }
    if (entryAddress === botAddress) {
      auth[i] = await authorizeEntry(entry, botKp, validUntilLedger, cfg.networkPassphrase);
    }
  }

  if (!replacedP1) {
    throw new Error('Could not find Player 1 auth stub in start_game simulation');
  }

  prepared.operations[0].auth = auth;

  // Re-simulate after auth injection so nonce-backed auth footprint matches the signed entry.
  const simAfterInjection = await server.simulateTransaction(prepared);
  if (simAfterInjection.error) {
    throw new Error(`start_game simulation failed after auth injection: ${simAfterInjection.error}`);
  }
  const finalTx = rpc.assembleTransaction(prepared, simAfterInjection).build();

  finalTx.sign(botKp);
  const sent = await server.sendTransaction(finalTx);
  if (!sent?.hash) throw new Error('start_game failed: RPC did not return a tx hash');

  const final = await server.pollTransaction(sent.hash, {
    attempts: 60,
    sleepStrategy: rpc.BasicSleepStrategy,
  });
  if (final.status !== 'SUCCESS') {
    const diag = summarizeDiagnosticErrors(final);
    throw new Error(`start_game failed (status=${final.status})${diag ? ` ${diag}` : ''}`);
  }

  return {
    txHash: sent.hash,
    sessionId: parsed.sessionId,
    modeId: parsed.modeId,
    player1: parsed.player1,
    player2: botAddress,
  };
}

async function commitBoardAsBot(session, cfg) {
  if (!session?.bot?.enabled) return null;
  if (!cfg.botSecret) throw new Error('Missing BOT_SECRET_KEY');
  const sid = tryParseU32(session.sessionId);
  if (sid === null) throw new Error('Invalid sessionId (expected u32)');

  const botKp = Keypair.fromSecret(cfg.botSecret);
  const commitmentHex = cleanHex(session.bot.commitmentHex);
  if (commitmentHex.length !== 64) throw new Error('Bot commitment hex must be 32 bytes');

  return await submitContractTxWithSigner(
    cfg,
    botKp,
    'commit_board',
    [
      nativeToScVal(sid, { type: 'u32' }),
      nativeToScVal(botKp.publicKey(), { type: 'address' }),
      nativeToScVal(Buffer.from(commitmentHex, 'hex'), { type: 'bytes' }),
    ],
    200
  );
}

async function commitTranscriptAsBot(session, cfg) {
  if (!session?.bot?.enabled) return null;
  if (!cfg.botSecret) throw new Error('Missing BOT_SECRET_KEY');
  if (!session.transcriptDigestHex) throw new Error('Transcript not ready');
  if (session.bot.transcriptCommittedOnChain) return null;

  const sid = tryParseU32(session.sessionId);
  if (sid === null) throw new Error('Invalid sessionId (expected u32)');
  const digestHex = cleanHex(session.transcriptDigestHex);
  if (digestHex.length !== 64) throw new Error('Transcript digest must be 32 bytes');

  const botKp = Keypair.fromSecret(cfg.botSecret);
  try {
    const txHash = await submitContractTxWithSigner(
      cfg,
      botKp,
      'commit_transcript',
      [
        nativeToScVal(sid, { type: 'u32' }),
        nativeToScVal(botKp.publicKey(), { type: 'address' }),
        nativeToScVal(Buffer.from(digestHex, 'hex'), { type: 'bytes' }),
      ],
      200
    );
    session.bot.transcriptCommittedOnChain = true;
    session.settle.p2 = {
      ...session.settle.p2,
      address: botKp.publicKey(),
      commitDone: true,
      digestHex,
    };
    if (session.bot.transcriptRetryTimer) {
      clearTimeout(session.bot.transcriptRetryTimer);
      session.bot.transcriptRetryTimer = null;
    }
    return txHash;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    // Even if a submit attempt reported FAILED, the digest may already be visible
    // on-chain (e.g., duplicate/late visibility race). Prefer chain truth.
    try {
      const onChain = await fetchOnChainTranscriptDigests(cfg, session.sessionId);
      const p2OnChain = cleanHex(onChain?.p2 ?? '');
      if (p2OnChain && p2OnChain === digestHex) {
        session.bot.transcriptCommittedOnChain = true;
        session.settle.p2 = {
          ...session.settle.p2,
          address: botKp.publicKey(),
          commitDone: true,
          digestHex,
        };
        if (session.bot.transcriptRetryTimer) {
          clearTimeout(session.bot.transcriptRetryTimer);
          session.bot.transcriptRetryTimer = null;
        }
        session.settle.error = null;
        return null;
      }
    } catch {
      // Ignore verification read failure and fall through to retry/throw rules.
    }

    if (isTransientRelayCommitError(msg)) {
      // Transient RPC visibility issue: keep waiting_for_commits and retry later.
      session.settle.error = null;
      return null;
    }
    if (msg.includes('Error(Contract, #10)') || msg.includes('AlreadyCommittedTranscript')) {
      session.bot.transcriptCommittedOnChain = true;
      session.settle.p2 = {
        ...session.settle.p2,
        address: botKp.publicKey(),
        commitDone: true,
        digestHex,
      };
      if (session.bot.transcriptRetryTimer) {
        clearTimeout(session.bot.transcriptRetryTimer);
        session.bot.transcriptRetryTimer = null;
      }
      return null;
    }
    throw err;
  }
}

async function reconcileTranscriptCommitsFromChain(session, cfg) {
  const settle = session?.settle;
  if (!settle) return;
  const currentDigest = cleanHex(session?.transcriptDigestHex ?? '');
  if (currentDigest.length !== 64) return;

  let onChain;
  try {
    onChain = await fetchOnChainTranscriptDigests(cfg, session.sessionId);
  } catch {
    return;
  }

  const p1OnChain = cleanHex(onChain?.p1 ?? '');
  const p2OnChain = cleanHex(onChain?.p2 ?? '');

  if (!settle.p1.commitDone && p1OnChain === currentDigest) {
    settle.p1 = {
      ...settle.p1,
      commitDone: true,
      digestHex: currentDigest,
    };
  }
  if (!settle.p2.commitDone && p2OnChain === currentDigest) {
    settle.p2 = {
      ...settle.p2,
      commitDone: true,
      digestHex: currentDigest,
    };
    if (session?.bot?.enabled) {
      session.bot.transcriptCommittedOnChain = true;
    }
  }
}

function scheduleBotTranscriptRetry(io, session, delayMs = 2500) {
  if (!session?.bot?.enabled) return;
  if (session.bot.transcriptRetryTimer) return;
  session.bot.transcriptRetryTimer = setTimeout(() => {
    session.bot.transcriptRetryTimer = null;
    void maybeStartSettlement(io, session);
  }, delayMs);
}

function scheduleBotTurn(io, session, turn) {
  if (!session?.bot?.enabled) return;
  if (isMatchComplete(session)) return;
  const sid = tryParseU32(session.sessionId);
  if (sid === null) return;
  const shotsPerTurn = session.shotsPerTurn === 2 ? 2 : 1;

  setTimeout(() => {
    if (isMatchComplete(session)) return;
    const shots = pickSmartBotShots(session, shotsPerTurn);
    if (!shots.length) return;

    session.movesByTurn.set(turn, {
      attacker: session.bot.address,
      shots,
    });
    for (const s of shots) {
      session.bot.fired.add(toCoordIdx(s.x, s.y));
    }
    session.lastUpdatedAt = nowMs();
    io.to(roomId(session.sessionId)).emit('move:recv', {
      sessionId: sid,
      from: session.bot.address,
      turn,
      shots,
    });
  }, 600);
}

function computeTranscript(session) {
  // Determine complete turns: have both move and result.
  const turns = Array.from(session.movesByTurn.keys())
    .filter((t) => session.resultsByTurn.has(t))
    .sort((a, b) => a - b);

  if (turns.length === 0) {
    session.transcriptHex = '';
    session.transcriptDigestHex = '';
    return;
  }

  // Determine shotsPerTurn (mode) from the first complete turn.
  const firstTurn = turns[0];
  const m0 = session.movesByTurn.get(firstTurn);
  const r0 = session.resultsByTurn.get(firstTurn);
  const shotsPerTurn = Array.isArray(m0?.shots) ? m0.shots.length : null;
  const resultsPerTurn = Array.isArray(r0?.results) ? r0.results.length : null;
  if (!shotsPerTurn || !resultsPerTurn || shotsPerTurn !== resultsPerTurn) {
    // Incomplete/invalid; leave previous values in place.
    return;
  }

  // Enforce only supported modes: 1 (classic) or 2 (salvo).
  if (shotsPerTurn !== 1 && shotsPerTurn !== 2) return;

  // Build transcript bytes: each shot is x,y,hit.
  const bytes = [];
  for (const turn of turns) {
    const move = session.movesByTurn.get(turn);
    const res = session.resultsByTurn.get(turn);
    if (!move || !res) continue;
    if (!Array.isArray(move.shots) || !Array.isArray(res.results)) continue;
    if (move.shots.length !== shotsPerTurn || res.results.length !== shotsPerTurn) continue;

    for (let i = 0; i < shotsPerTurn; i++) {
      const s = move.shots[i];
      const r = res.results[i];
      const x = Number(s?.x ?? 0) & 0xff;
      const y = Number(s?.y ?? 0) & 0xff;
      const hit = r?.hit ? 1 : 0;
      bytes.push(x, y, hit);
    }
  }

  const buf = Buffer.from(bytes);
  session.shotsPerTurn = shotsPerTurn;
  session.modeId = shotsPerTurn === 2 ? 1 : 0;
  session.transcriptHex = buf.toString('hex');
  session.transcriptDigestHex = sha256Hex(buf);
}

function publicSettleStatus(session) {
  const { settle } = session;
  return {
    sessionId: session.sessionId,
    phase: settle.phase,
    phaseUpdatedAt: settle.phaseUpdatedAt ?? null,
    statusVersion: Number(settle.statusVersion ?? 0),
    transcriptDigestHex: session.transcriptDigestHex,
    modeId: session.modeId,
    shotsPerTurn: session.shotsPerTurn,
    p1: {
      address: settle.p1.address,
      commitDone: !!settle.p1.commitDone,
      revealed: !!settle.p1.reveal,
    },
    p2: {
      address: settle.p2.address,
      commitDone: !!settle.p2.commitDone,
      revealed: !!settle.p2.reveal,
    },
    txHash: settle.txHash,
    error: settle.error,
  };
}

function broadcastSettleStatus(io, session) {
  const { settle } = session;
  settle.statusVersion = Number(settle.statusVersion ?? 0) + 1;
  settle.phaseUpdatedAt = nowMs();
  io.to(roomId(session.sessionId)).emit('settle:status', publicSettleStatus(session));
}

function scheduleSettleRetry(io, session, delayMs = 2500) {
  if (session?.settle?.retryTimer) return;
  session.settle.retryTimer = setTimeout(() => {
    session.settle.retryTimer = null;
    void maybeStartSettlement(io, session);
  }, delayMs);
}

function parseProofOutput(parsed) {
  const sealHex = cleanHex(parsed?.seal_hex ?? parsed?.sealHex ?? '');
  const journalHex = cleanHex(parsed?.journal_hex ?? parsed?.journalHex ?? '');
  if (!sealHex || !journalHex) throw new Error('Prover output missing seal_hex/journal_hex');
  return { sealHex, journalHex };
}

async function runLocalProver(input, proverBin, sessionId) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), `zkbs-${sessionId}-`));
  const inputPath = path.join(tmpDir, 'input.json');
  const outPath = path.join(tmpDir, 'proof.json');
  await fs.writeFile(inputPath, JSON.stringify(input, null, 2), 'utf8');

  await execFileAsync(proverBin, ['--input', inputPath, '--out', outPath], {
    maxBuffer: 1024 * 1024 * 20,
  });

  const raw = await fs.readFile(outPath, 'utf8');
  const parsed = JSON.parse(raw);
  return parseProofOutput(parsed);
}

function shouldUseGithubProver(cfg) {
  const backend = String(cfg?.proverBackend ?? 'auto').toLowerCase();
  const hasGithubConfig = !!cfg?.githubToken && !!cfg?.githubRepo && !!cfg?.githubWorkflow && !!cfg?.githubWorkflowRef;
  if (backend === 'local') return false;
  if (backend === 'github') {
    if (!hasGithubConfig) {
      throw new Error(
        'GitHub prover backend selected but GitHub config is incomplete (GITHUB_TOKEN/GITHUB_REPO/GITHUB_WORKFLOW/GITHUB_WORKFLOW_REF).'
      );
    }
    return true;
  }
  if (backend === 'auto') return hasGithubConfig;
  throw new Error(`Invalid ZKBS_PROVER_BACKEND value: ${backend} (expected local|github|auto)`);
}

function parseGithubRepoSlug(slug) {
  const m = /^([^/\s]+)\/([^/\s]+)$/.exec(String(slug ?? '').trim());
  if (!m) throw new Error('GITHUB_REPO must be in owner/repo format');
  return { owner: m[1], repo: m[2] };
}

async function githubApiRequest(cfg, apiPath, opts = {}) {
  if (typeof fetch !== 'function') throw new Error('Global fetch is unavailable in this Node runtime');
  const url = `https://api.github.com${apiPath}`;
  const headers = {
    authorization: `Bearer ${cfg.githubToken}`,
    accept: opts.accept || 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    'user-agent': 'stellarship-relay',
  };
  const method = opts.method || 'GET';
  const hasJson = Object.prototype.hasOwnProperty.call(opts, 'json');
  if (hasJson) headers['content-type'] = 'application/json';

  const resp = await fetch(url, {
    method,
    headers,
    body: hasJson ? JSON.stringify(opts.json) : undefined,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`GitHub API ${method} ${apiPath} failed (${resp.status}): ${text.slice(0, 400)}`);
  }
  return resp;
}

async function readProofFromArtifactZip(zipBuf, sessionId) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), `zkbs-gh-${sessionId}-`));
  const zipPath = path.join(tmpDir, 'artifact.zip');
  await fs.writeFile(zipPath, zipBuf);

  try {
    let entries = [];
    try {
      const list = await execFileAsync('unzip', ['-Z1', zipPath], {
        maxBuffer: 1024 * 1024 * 4,
      });
      entries = String(list.stdout || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
    } catch {
      // Fallback path lookup if -Z is unavailable.
      const list = await execFileAsync('unzip', ['-l', zipPath], {
        maxBuffer: 1024 * 1024 * 4,
      });
      entries = String(list.stdout || '')
        .split('\n')
        .map((s) => s.trim().split(/\s+/).pop() || '')
        .filter((s) => s && !s.startsWith('---') && !s.startsWith('Name') && !s.startsWith('Length'));
    }

    const proofEntry =
      entries.find((e) => /(^|\/)proof\.json$/i.test(e)) ||
      entries.find((e) => e.toLowerCase().endsWith('.json'));
    if (!proofEntry) throw new Error('GitHub artifact did not contain proof.json');

    const extracted = await execFileAsync('unzip', ['-p', zipPath, proofEntry], {
      maxBuffer: 1024 * 1024 * 20,
    });
    const parsed = JSON.parse(String(extracted.stdout || '{}'));
    return parseProofOutput(parsed);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

async function runGithubProver(input, cfg, sessionId) {
  const { owner, repo } = parseGithubRepoSlug(cfg.githubRepo);
  const workflow = encodeURIComponent(cfg.githubWorkflow);
  const requestId = crypto.randomBytes(8).toString('hex');
  const artifactName = `zkbs-proof-${requestId}`;
  const createdAfterMs = Date.now() - 60 * 1000;

  await githubApiRequest(cfg, `/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`, {
    method: 'POST',
    json: {
      ref: cfg.githubWorkflowRef,
      inputs: {
        request_id: requestId,
        artifact_name: artifactName,
        session_id: String(input.session_id),
        mode_id: String(input.mode_id),
        p1_salt_hex: input.p1_salt_hex,
        p1_board_bits_hex: input.p1_board_bits_hex,
        p2_salt_hex: input.p2_salt_hex,
        p2_board_bits_hex: input.p2_board_bits_hex,
        transcript_hex: input.transcript_hex,
      },
    },
  });

  const timeoutMs = cfg.githubTimeoutMs;
  const deadline = Date.now() + timeoutMs;
  let runUrl = '';

  while (Date.now() < deadline) {
    const runsResp = await githubApiRequest(
      cfg,
      `/repos/${owner}/${repo}/actions/workflows/${workflow}/runs?event=workflow_dispatch&branch=${encodeURIComponent(
        cfg.githubWorkflowRef
      )}&per_page=20`
    );
    const runsJson = await runsResp.json();
    const runs = Array.isArray(runsJson?.workflow_runs) ? runsJson.workflow_runs : [];
    const recentRuns = runs.filter((r) => {
      const created = Date.parse(String(r?.created_at || ''));
      return Number.isFinite(created) && created >= createdAfterMs;
    });

    const taggedRuns = recentRuns.filter((r) => {
      const title = String(r?.display_title ?? '');
      const name = String(r?.name ?? '');
      return title.includes(requestId) || name.includes(requestId);
    });
    const candidates = (taggedRuns.length ? taggedRuns : recentRuns).sort((a, b) => {
      const ta = Date.parse(String(a?.created_at || '0'));
      const tb = Date.parse(String(b?.created_at || '0'));
      return tb - ta;
    });

    let matchedPending = false;
    for (const run of candidates) {
      const runId = Number(run?.id);
      if (!Number.isFinite(runId) || runId <= 0) continue;
      runUrl = String(run?.html_url ?? runUrl);

      const artResp = await githubApiRequest(
        cfg,
        `/repos/${owner}/${repo}/actions/runs/${runId}/artifacts?per_page=100`
      );
      const artJson = await artResp.json();
      const artifacts = Array.isArray(artJson?.artifacts) ? artJson.artifacts : [];
      const artifact = artifacts.find((a) => String(a?.name ?? '') === artifactName && !a?.expired);
      if (!artifact) continue;

      const status = String(run?.status ?? '');
      if (status !== 'completed') {
        matchedPending = true;
        continue;
      }

      const conclusion = String(run?.conclusion ?? '');
      if (conclusion !== 'success') {
        throw new Error(`GitHub prover workflow failed (${conclusion || 'unknown'}). ${runUrl}`);
      }

      const artifactId = Number(artifact?.id);
      if (!Number.isFinite(artifactId) || artifactId <= 0) {
        throw new Error('GitHub prover workflow completed, but artifact id was missing.');
      }
      const zipResp = await githubApiRequest(
        cfg,
        `/repos/${owner}/${repo}/actions/artifacts/${artifactId}/zip`,
        { accept: 'application/octet-stream' }
      );
      const zip = Buffer.from(await zipResp.arrayBuffer());
      return await readProofFromArtifactZip(zip, sessionId);
    }

    if (!matchedPending) {
      // No matching artifact yet; keep polling for run startup/queue.
    }
    await sleep(cfg.githubPollMs);
  }

  const seconds = Math.max(1, Math.round(timeoutMs / 1000));
  throw new Error(`GitHub prover timed out after ${seconds}s.${runUrl ? ` ${runUrl}` : ''}`);
}

async function runProver(session, cfg) {
  const { settle } = session;
  if (!settle.p1.reveal || !settle.p2.reveal) throw new Error('Missing reveals');
  if (!session.transcriptHex) throw new Error('Transcript not ready');
  if (typeof session.modeId !== 'number') throw new Error('Missing mode id');

  const sid = tryParseU32(session.sessionId);
  if (sid === null) throw new Error('Invalid sessionId (expected u32)');

  const input = {
    session_id: sid,
    mode_id: session.modeId,
    p1_salt_hex: settle.p1.reveal.saltHex,
    p1_board_bits_hex: settle.p1.reveal.boardBitsHex,
    p2_salt_hex: settle.p2.reveal.saltHex,
    p2_board_bits_hex: settle.p2.reveal.boardBitsHex,
    transcript_hex: session.transcriptHex,
  };
  const useGithub = shouldUseGithubProver(cfg);
  if (useGithub) {
    try {
      return await runGithubProver(input, cfg, session.sessionId);
    } catch (err) {
      if (cfg.proverBackend === 'github') throw err;
      // In auto mode, fallback to local prover if GitHub dispatcher is unavailable.
    }
  }
  return runLocalProver(input, cfg.proverBin, session.sessionId);
}

async function submitEndGame(sessionId, sealHex, journalHex, cfg) {
  if (!cfg.contractId) throw new Error('Missing ZK_BATTLESHIP_CONTRACT_ID');
  if (!cfg.relayerSecret) throw new Error('Missing RELAYER_SECRET_KEY');

  const sid = tryParseU32(sessionId);
  if (sid === null) throw new Error('Invalid sessionId (expected u32)');

  const kp = Keypair.fromSecret(cfg.relayerSecret);
  const server = new rpc.Server(cfg.rpcUrl, { allowHttp: cfg.rpcUrl.startsWith('http://') });
  const account = await server.getAccount(kp.publicKey());

  const contract = new Contract(cfg.contractId);
  const op = contract.call(
    'end_game',
    nativeToScVal(sid, { type: 'u32' }),
    nativeToScVal(Buffer.from(cleanHex(sealHex), 'hex'), { type: 'bytes' }),
    nativeToScVal(Buffer.from(cleanHex(journalHex), 'hex'), { type: 'bytes' })
  );

  const tx = new TransactionBuilder(account, {
    fee: String(Number(BASE_FEE) * 1000),
    networkPassphrase: cfg.networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(60)
    .build();

  const prepared = await server.prepareTransaction(tx);
  prepared.sign(kp);
  const sent = await server.sendTransaction(prepared);
  if (!sent?.hash) throw new Error('RPC did not return a tx hash');
  if (sent.status && String(sent.status) !== 'PENDING') {
    throw new Error(summarizeSendError('end_game', sent));
  }

  const final = await waitForFinalStatus(server, sent.hash, 240);
  const finalStatus = String(final?.status ?? 'NOT_FOUND');
  if (finalStatus !== 'SUCCESS') {
    const diag = summarizeDiagnosticErrors(final);
    throw new Error(`end_game failed (status=${finalStatus})${diag ? ` ${diag}` : ''}`);
  }
  return sent.hash;
}

async function maybeStartSettlement(io, session) {
  const cfg = getRelayConfig();
  const { settle } = session;
  computeTranscript(session);

  // Never start settlement (or commit transcript on behalf of bot) before the match is over.
  // Doing this early can lock a stale digest on-chain and cause digest/journal mismatch.
  if (!isMatchComplete(session)) {
    if (!settle.inProgress && settle.phase !== 'done' && settle.phase !== 'error') {
      settle.phase = 'idle';
      broadcastSettleStatus(io, session);
    }
    return;
  }

  if (session.bot?.enabled) {
    settle.p2.address = session.bot.address;
    if (!settle.p2.reveal && session.bot.saltHex && session.bot.boardBitsHex) {
      settle.p2.reveal = {
        saltHex: session.bot.saltHex,
        boardBitsHex: session.bot.boardBitsHex,
      };
    }
    if (session.transcriptDigestHex && !settle.p2.commitDone) {
      try {
        await commitTranscriptAsBot(session, cfg);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        settle.phase = 'error';
        settle.error = msg;
        broadcastSettleStatus(io, session);
        return;
      }
      if (!settle.p2.commitDone) {
        settle.phase = 'waiting_for_commits';
        settle.error = null;
        broadcastSettleStatus(io, session);
        scheduleBotTranscriptRetry(io, session);
        return;
      }
    }
  }

  // Reconcile commit flags with on-chain truth to recover from transient socket/client state loss.
  await reconcileTranscriptCommitsFromChain(session, cfg);

  // Safety net: if committed digests diverge (or drift from current transcript), never proceed.
  const currentDigest = cleanHex(session.transcriptDigestHex);
  const p1Digest = cleanHex(settle.p1?.digestHex ?? '');
  const p2Digest = cleanHex(settle.p2?.digestHex ?? '');
  if (settle.p1.commitDone && settle.p2.commitDone) {
    if (!currentDigest || !p1Digest || !p2Digest || p1Digest !== p2Digest || p1Digest !== currentDigest) {
      settle.phase = 'error';
      settle.error =
        'Transcript digest mismatch between players and relayer transcript. Start a new match and finalize once both sides are complete.';
      broadcastSettleStatus(io, session);
      return;
    }
  }

  // Critical gate: even if clients/bot announced commitDone, do not proceed until both
  // transcript digests are visible on-chain. This avoids submitting end_game too early
  // and bouncing between waiting/submitting under RPC finality lag.
  if (settle.p1.commitDone && settle.p2.commitDone && currentDigest) {
    try {
      const onChain = await fetchOnChainTranscriptDigests(cfg, session.sessionId);
      const p1OnChain = cleanHex(onChain?.p1 ?? '');
      const p2OnChain = cleanHex(onChain?.p2 ?? '');
      const bothVisible = p1OnChain === currentDigest && p2OnChain === currentDigest;
      if (!bothVisible) {
        settle.phase = 'waiting_for_commits';
        settle.error = null;
        broadcastSettleStatus(io, session);
        scheduleSettleRetry(io, session);
        return;
      }
    } catch {
      settle.phase = 'waiting_for_commits';
      settle.error = null;
      broadcastSettleStatus(io, session);
      scheduleSettleRetry(io, session);
      return;
    }
  }

  // Update waiting phases (purely UX).
  if (!session.transcriptDigestHex) {
    settle.phase = 'waiting_for_transcript';
    broadcastSettleStatus(io, session);
    return;
  }
  if (!settle.p1.commitDone || !settle.p2.commitDone) {
    settle.phase = 'waiting_for_commits';
    broadcastSettleStatus(io, session);
    scheduleSettleRetry(io, session);
    return;
  }
  if (!settle.p1.reveal || !settle.p2.reveal) {
    settle.phase = 'waiting_for_reveals';
    broadcastSettleStatus(io, session);
    return;
  }

  if (settle.inProgress || settle.phase === 'done') return;
  settle.inProgress = true;
  settle.error = null;

  try {
    let proof = settle.proof;
    if (!proof?.sealHex || !proof?.journalHex) {
      settle.phase = 'proving';
      broadcastSettleStatus(io, session);
      proof = await runProver(session, cfg);
      settle.proof = proof;
    }

    settle.phase = 'submitting';
    broadcastSettleStatus(io, session);
    const txHash = await submitEndGame(session.sessionId, proof.sealHex, proof.journalHex, cfg);
    settle.txHash = txHash;

    settle.phase = 'done';
    broadcastSettleStatus(io, session);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Error(Contract, #9)') || msg.includes('TranscriptNotCommitted')) {
      settle.phase = 'waiting_for_commits';
      settle.error = null;
      broadcastSettleStatus(io, session);
      scheduleSettleRetry(io, session);
      return;
    }
    settle.phase = 'error';
    settle.error = msg;
    broadcastSettleStatus(io, session);
  } finally {
    settle.inProgress = false;
  }
}

io.on('connection', (socket) => {
  socket.on('bot:get_info', (payload, ack) => {
    try {
      void payload;
      const cfg = getRelayConfig();
      if (!cfg.botSecret) throw new Error('Bot mode not configured on relay (missing BOT_SECRET_KEY)');
      const botKp = Keypair.fromSecret(cfg.botSecret);
      if (typeof ack === 'function') {
        ack({
          ok: true,
          botAddress: botKp.publicKey(),
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (typeof ack === 'function') ack({ ok: false, error: msg });
    }
  });

  socket.on('bot:start_match', async (payload, ack) => {
    try {
      const authEntryXdr = String(payload?.player1AuthEntryXdr ?? payload?.authEntryXdr ?? '').trim();
      if (!authEntryXdr) throw new Error('Missing player1AuthEntryXdr');

      const cfg = getRelayConfig();
      const started = await startGameAsBotFromAuth(authEntryXdr, cfg);
      const session = getOrCreateSessionState(started.sessionId);
      session.lastUpdatedAt = nowMs();
      session.modeId = started.modeId;
      session.shotsPerTurn = started.modeId === 1 ? 2 : 1;

      const board = generateDefensiveBoard(started.player1);
      const saltHex = randomSaltHex32();
      const commitmentHex = buildBoardCommitmentHex(saltHex, board.boardBitsHex);

      session.bot = {
        enabled: true,
        address: started.player2,
        saltHex,
        boardBitsHex: board.boardBitsHex,
        commitmentHex,
        occupied: board.occupied,
        fired: new Set(),
        transcriptCommittedOnChain: false,
      };

      session.settle.p1 = {
        ...session.settle.p1,
        address: started.player1,
        commitDone: false,
        digestHex: null,
      };
      session.settle.p2 = {
        ...session.settle.p2,
        address: started.player2,
        commitDone: false,
        digestHex: null,
        reveal: {
          saltHex,
          boardBitsHex: board.boardBitsHex,
        },
      };
      session.settle.phase = 'idle';
      session.settle.phaseUpdatedAt = nowMs();
      session.settle.statusVersion = 0;
      session.settle.error = null;
      session.settle.txHash = null;
      session.settle.proof = null;
      session.settle.inProgress = false;

      const commitBoardTxHash = await commitBoardAsBot(session, cfg);

      if (typeof ack === 'function') {
        ack({
          ok: true,
          sessionId: started.sessionId,
          modeId: started.modeId,
          player1: started.player1,
          player2: started.player2,
          startGameTxHash: started.txHash,
          commitBoardTxHash,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (typeof ack === 'function') ack({ ok: false, error: msg });
    }
  });

  socket.on('room:join', (payload) => {
    const { sessionId, address, modeId } = payload || {};
    if (!sessionId) return;

    socket.data.sessionId = sessionId;
    socket.data.address = address;

    const session = getOrCreateSessionState(sessionId);
    session.lastUpdatedAt = nowMs();
    if (typeof modeId === 'number' && (modeId === 0 || modeId === 1)) {
      session.modeId = modeId;
      session.shotsPerTurn = modeId === 1 ? 2 : 1;
    }

    const rid = roomId(sessionId);
    socket.join(rid);

    // Send a full peer snapshot to the joiner so both sides converge immediately.
    const peers = [];
    const room = io.sockets.adapter.rooms.get(rid);
    if (room) {
      for (const sid of room) {
        if (sid === socket.id) continue;
        const peerSocket = io.sockets.sockets.get(sid);
        const peerAddr = String(peerSocket?.data?.address ?? '');
        if (peerAddr) peers.push(peerAddr);
      }
    }
    if (session.bot?.enabled && session.bot.address && session.bot.address !== address) {
      peers.push(session.bot.address);
    }
    socket.emit('room:state', { peers: Array.from(new Set(peers)) });
    const pendingOffer = getPendingRematchOffer(sessionId);
    if (pendingOffer) {
      const isForSocket =
        !address ||
        !pendingOffer.to ||
        pendingOffer.from === address ||
        pendingOffer.to === address;
      if (isForSocket) {
        socket.emit('rematch:offer', pendingOffer);
      }
    }
    socket.to(rid).emit('room:peer_joined', { address });
  });

  socket.on('rematch:offer', (payload, ack) => {
    try {
      const sessionId = tryParseU32(payload?.sessionId ?? socket.data.sessionId);
      const newSessionId = tryParseU32(payload?.newSessionId);
      const modeId = Number(payload?.modeId);
      const from = String(payload?.address ?? socket.data.address ?? '').trim();
      const toRaw = String(payload?.to ?? '').trim();
      const to = toRaw || null;
      const authEntryXdr = String(payload?.authEntryXdr ?? '').trim();

      if (sessionId === null) throw new Error('Invalid sessionId');
      if (newSessionId === null) throw new Error('Invalid newSessionId');
      if (modeId !== 0 && modeId !== 1) throw new Error('modeId must be 0 or 1');
      if (!from) throw new Error('Missing sender address');
      if (!authEntryXdr) throw new Error('Missing authEntryXdr');
      if (to && to === from) throw new Error('Cannot rematch yourself');

      const session = getOrCreateSessionState(sessionId);
      session.lastUpdatedAt = nowMs();

      const p1 = String(session.settle?.p1?.address ?? '');
      const p2 = String(session.settle?.p2?.address ?? '');
      if (p1 && p2 && from !== p1 && from !== p2) {
        throw new Error('Only match participants can offer a rematch.');
      }
      if (to && p1 && p2 && to !== p1 && to !== p2) {
        throw new Error('Rematch target is not a participant of this match.');
      }

      const existing = getPendingRematchOffer(sessionId);
      if (existing && existing.newSessionId !== newSessionId) {
        throw new Error('A rematch offer is already pending for this match.');
      }

      const now = nowMs();
      const offer = {
        sessionId,
        modeId,
        newSessionId,
        from,
        to,
        authEntryXdr,
        createdAt: now,
        expiresAt: now + REMATCH_OFFER_TTL_MS,
      };
      putPendingRematchOffer(sessionId, offer);
      io.to(roomId(sessionId)).emit('rematch:offer', offer);

      if (typeof ack === 'function') ack({ ok: true, offer });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (typeof ack === 'function') ack({ ok: false, error: msg });
    }
  });

  socket.on('rematch:cancel', (payload, ack) => {
    try {
      const sessionId = tryParseU32(payload?.sessionId ?? socket.data.sessionId);
      const from = String(payload?.address ?? socket.data.address ?? '').trim();
      if (sessionId === null) throw new Error('Invalid sessionId');
      if (!from) throw new Error('Missing sender address');

      const offer = getPendingRematchOffer(sessionId);
      if (!offer) throw new Error('No pending rematch offer found.');
      if (offer.from !== from) throw new Error('Only the offer creator can cancel this rematch.');
      if (payload?.newSessionId && Number(payload.newSessionId) !== Number(offer.newSessionId)) {
        throw new Error('newSessionId does not match pending offer');
      }

      clearPendingRematchOffer(sessionId);
      io.to(roomId(sessionId)).emit('rematch:canceled', {
        sessionId,
        newSessionId: offer.newSessionId,
        from,
      });
      if (typeof ack === 'function') ack({ ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (typeof ack === 'function') ack({ ok: false, error: msg });
    }
  });

  socket.on('rematch:decline', (payload, ack) => {
    try {
      const sessionId = tryParseU32(payload?.sessionId ?? socket.data.sessionId);
      const from = String(payload?.address ?? socket.data.address ?? '').trim();
      if (sessionId === null) throw new Error('Invalid sessionId');
      if (!from) throw new Error('Missing sender address');

      const offer = getPendingRematchOffer(sessionId);
      if (!offer) throw new Error('No pending rematch offer found.');
      if (from === offer.from) throw new Error('Offer creator cannot decline their own rematch.');
      if (offer.to && from !== offer.to) throw new Error('This rematch is targeted to a different player.');
      if (payload?.newSessionId && Number(payload.newSessionId) !== Number(offer.newSessionId)) {
        throw new Error('newSessionId does not match pending offer');
      }

      clearPendingRematchOffer(sessionId);
      io.to(roomId(sessionId)).emit('rematch:declined', {
        sessionId,
        newSessionId: offer.newSessionId,
        from,
      });
      if (typeof ack === 'function') ack({ ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (typeof ack === 'function') ack({ ok: false, error: msg });
    }
  });

  socket.on('rematch:started', (payload, ack) => {
    try {
      const sessionId = tryParseU32(payload?.sessionId ?? socket.data.sessionId);
      const startedBy = String(payload?.address ?? socket.data.address ?? '').trim();
      const newSessionId = tryParseU32(payload?.newSessionId);
      const modeId = Number(payload?.modeId);
      const player1 = String(payload?.player1 ?? '').trim();
      const player2 = String(payload?.player2 ?? '').trim();
      const txHash = String(payload?.txHash ?? '').trim() || null;

      if (sessionId === null) throw new Error('Invalid sessionId');
      if (!startedBy) throw new Error('Missing sender address');
      if (newSessionId === null) throw new Error('Invalid newSessionId');
      if (modeId !== 0 && modeId !== 1) throw new Error('modeId must be 0 or 1');
      if (!player1 || !player2) throw new Error('Missing rematch players');

      const offer = getPendingRematchOffer(sessionId);
      if (!offer) throw new Error('No pending rematch offer found.');
      if (Number(offer.newSessionId) !== Number(newSessionId)) {
        throw new Error('newSessionId does not match pending offer');
      }

      clearPendingRematchOffer(sessionId);
      io.to(roomId(sessionId)).emit('rematch:started', {
        sessionId,
        modeId,
        newSessionId,
        player1,
        player2,
        startedBy,
        txHash,
      });

      if (typeof ack === 'function') ack({ ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (typeof ack === 'function') ack({ ok: false, error: msg });
    }
  });

  socket.on('move:send', (payload) => {
    const { sessionId } = payload || {};
    if (!sessionId) return;
    const session = getOrCreateSessionState(sessionId);
    session.lastUpdatedAt = nowMs();
    const turn = tryParseU32(payload?.turn);
      if (turn !== null) {
        if (session.bot?.enabled) {
          const fromAddress = String(payload?.from ?? '');
          const player1Address = String(session.settle?.p1?.address ?? '');
          if (!fromAddress || !player1Address || fromAddress !== player1Address) {
            return;
          }
          const incomingShots = Array.isArray(payload?.shots) ? payload.shots : [];
          rememberOpponentShots(player1Address, incomingShots);
        }
        session.movesByTurn.set(turn, {
          attacker: String(payload?.from ?? ''),
          shots: Array.isArray(payload?.shots) ? payload.shots : [],
        });
      if (session.bot?.enabled) {
        const botAddr = String(session.bot.address ?? '');
        const shots = Array.isArray(payload?.shots) ? payload.shots : [];
        const results = shots.map((s) => {
          const x = Number(s?.x ?? 0);
          const y = Number(s?.y ?? 0);
          const hit = session.bot.occupied.has(coordKey(x, y));
          return { x, y, hit };
        });

        session.resultsByTurn.set(turn, {
          defender: botAddr,
          results,
        });
        computeTranscript(session);
        const sid = tryParseU32(sessionId);
        if (sid === null) return;
        io.to(roomId(sessionId)).emit('move:result', {
          sessionId: sid,
          from: botAddr,
          turn,
          results,
        });

        if (!isMatchComplete(session)) {
          scheduleBotTurn(io, session, turn + 1);
        }
        return;
      }
      computeTranscript(session);
    }
    socket.to(roomId(sessionId)).emit('move:recv', payload);
  });

  socket.on('move:result', (payload) => {
    const { sessionId } = payload || {};
    if (!sessionId) return;
    const session = getOrCreateSessionState(sessionId);
    session.lastUpdatedAt = nowMs();
    const turn = tryParseU32(payload?.turn);
    if (turn !== null) {
      if (session.bot?.enabled) {
        const fromAddress = String(payload?.from ?? '');
        const player1Address = String(session.settle?.p1?.address ?? '');
        if (!fromAddress || !player1Address || fromAddress !== player1Address) {
          return;
        }
      }
      session.resultsByTurn.set(turn, {
        defender: String(payload?.from ?? ''),
        results: Array.isArray(payload?.results) ? payload.results : [],
      });
      computeTranscript(session);

      if (session.bot?.enabled) {
        void maybeStartSettlement(io, session);
        return;
      }
    }
    socket.to(roomId(sessionId)).emit('move:result', payload);
  });

  socket.on('settle:get', (payload, ack) => {
    const sessionId = payload?.sessionId ?? socket.data.sessionId;
    const session = sessionId ? getOrCreateSessionState(sessionId) : null;
    if (!session) {
      if (typeof ack === 'function') ack({ ok: false, error: 'Missing sessionId' });
      return;
    }
    session.lastUpdatedAt = nowMs();
    computeTranscript(session);

    const resp = {
      ok: true,
      transcriptDigestHex: session.transcriptDigestHex,
      transcriptHex: session.transcriptHex,
      modeId: session.modeId,
      shotsPerTurn: session.shotsPerTurn,
      status: publicSettleStatus(session),
    };
    if (typeof ack === 'function') ack(resp);

    // If conditions are already met, kick off settlement immediately.
    void maybeStartSettlement(io, session);
  });

  socket.on('settle:reveal', async (payload, ack) => {
    try {
      const sessionId = payload?.sessionId ?? socket.data.sessionId;
      const role = String(payload?.role ?? '');
      const address = String(payload?.address ?? socket.data.address ?? '');
      const saltHex = cleanHex(payload?.saltHex ?? payload?.salt_hex ?? '');
      const boardBitsHex = cleanHex(payload?.boardBitsHex ?? payload?.board_bits_hex ?? '');

      const session = sessionId ? getOrCreateSessionState(sessionId) : null;
      if (!session) throw new Error('Missing sessionId');
      if (role !== 'p1' && role !== 'p2') throw new Error('role must be p1 or p2');
      if (!address) throw new Error('Missing address');
      if (saltHex.length !== 64) throw new Error('saltHex must be 32 bytes (64 hex chars)');
      if (boardBitsHex.length !== 16) throw new Error('boardBitsHex must be 8 bytes (16 hex chars)');

      session.lastUpdatedAt = nowMs();
      if (!isMatchComplete(session)) {
        throw new Error('Game not complete yet. Finish the match before finalizing.');
      }
      session.settle[role] = {
        ...session.settle[role],
        address,
        reveal: { saltHex, boardBitsHex },
      };

      broadcastSettleStatus(io, session);
      if (typeof ack === 'function') ack({ ok: true });
      void maybeStartSettlement(io, session);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (typeof ack === 'function') ack({ ok: false, error: msg });
    }
  });

  socket.on('settle:commit_done', async (payload, ack) => {
    try {
      const sessionId = payload?.sessionId ?? socket.data.sessionId;
      const role = String(payload?.role ?? '');
      const address = String(payload?.address ?? socket.data.address ?? '');
      const digestHex = cleanHex(payload?.transcriptDigestHex ?? payload?.digestHex ?? '');

      const session = sessionId ? getOrCreateSessionState(sessionId) : null;
      if (!session) throw new Error('Missing sessionId');
      if (role !== 'p1' && role !== 'p2') throw new Error('role must be p1 or p2');
      if (!address) throw new Error('Missing address');

      session.lastUpdatedAt = nowMs();
      computeTranscript(session);
      if (!isMatchComplete(session)) {
        throw new Error('Game not complete yet. Finish the match before finalizing.');
      }

      if (session.transcriptDigestHex && digestHex && digestHex !== session.transcriptDigestHex) {
        throw new Error('Digest mismatch: player committed a different digest than relayer transcript');
      }

      const expectedDigest = digestHex || session.transcriptDigestHex;
      let commitVisibleOnChain = false;
      if (expectedDigest && expectedDigest.length === 64) {
        try {
          const cfg = getRelayConfig();
          const onChain = await fetchOnChainTranscriptDigests(cfg, session.sessionId);
          const onChainDigest = role === 'p1' ? cleanHex(onChain?.p1 ?? '') : cleanHex(onChain?.p2 ?? '');
          commitVisibleOnChain = onChainDigest === expectedDigest;
        } catch {
          // Keep waiting_for_commits; settlement loop will reconcile and retry.
        }
      }

      session.settle[role] = {
        ...session.settle[role],
        address,
        commitDone: commitVisibleOnChain,
        digestHex: expectedDigest,
      };

      broadcastSettleStatus(io, session);
      if (typeof ack === 'function') ack({ ok: true });
      void maybeStartSettlement(io, session);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (typeof ack === 'function') ack({ ok: false, error: msg });
    }
  });

  socket.on('disconnect', () => {
    const sessionId = socket.data.sessionId;
    const address = socket.data.address;
    if (!sessionId) return;
    socket.to(roomId(sessionId)).emit('room:peer_left', { address });
  });
});

// Best-effort cleanup to avoid unbounded growth.
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
setInterval(() => {
  const cutoff = nowMs() - SESSION_TTL_MS;
  for (const [sid, s] of sessions.entries()) {
    if ((s.lastUpdatedAt ?? 0) < cutoff) sessions.delete(sid);
  }
  for (const [sid, offer] of rematchOffers.entries()) {
    if (Number(offer?.expiresAt ?? 0) <= nowMs()) rematchOffers.delete(sid);
  }
}, 10 * 60 * 1000);

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[relay] listening on :${PORT}`);
});
