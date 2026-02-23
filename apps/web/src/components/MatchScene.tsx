'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Clock3, Copy, Shield, Skull, Swords, Trophy, Wifi, WifiOff, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useStellarWallet } from '@/components/StellarWalletProvider';
import { MedievalPanel } from '@/components/ui/MedievalPanel';
import { MedievalButton } from '@/components/ui/MedievalButton';
import { ZkBattleshipService } from '@/lib/stellar/zkBattleshipService';
import { encodeBoardBits, sha256CommitBoard } from '@/lib/game/commitment';
import {
  useRelay,
  type MoveRecvPayload,
  type MoveResultPayload,
  type RematchOfferPayload,
  type RematchStartedPayload,
  type SettleStatusPayload,
  type Shot,
} from '@/hooks/useRelay';

const MODE_CLASSIC = 0 as const;
const MODE_SALVO = 1 as const;

const GRID_SIZE = 8;
const SHIP_CELLS = 10;
type CopyFeedbackKey = 'proverInput' | 'commitment' | 'salt' | 'bytes' | 'digest' | 'transcript';
type H2HMode = 'pvp' | 'pvc';
type H2HResult = 'W' | 'L' | 'D' | null;
type H2HStats = {
  games: number;
  wins: number;
  losses: number;
  draws: number;
  lastResult: H2HResult;
  updatedAt: number;
};

type CellState = 0 | 1 | 2; // 0 unknown, 1 miss, 2 hit

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase().replace(/^0x/, '').replace(/[^0-9a-f]/g, '');
  if (!clean) return new Uint8Array();
  if (clean.length % 2 !== 0) throw new Error('Invalid hex length');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function impactKey(x: number, y: number): string {
  return `${x}:${y}`;
}

function normalizeHex(hex: string): string {
  return hex.trim().toLowerCase().replace(/^0x/, '').replace(/[^0-9a-f]/g, '');
}

function digestHexFromValue(value: any): string {
  if (value === null || value === undefined) return '';

  if (typeof value === 'string') {
    const clean = normalizeHex(value);
    return clean.length === 64 ? clean : '';
  }

  if (value instanceof Uint8Array) {
    return value.length === 32 ? bytesToHex(value) : '';
  }

  if (Array.isArray(value)) {
    const bytes = Uint8Array.from(value as number[]);
    return bytes.length === 32 ? bytesToHex(bytes) : '';
  }

  if (typeof value === 'object') {
    // Handle generated Option-like wrappers and nested value containers.
    if (Array.isArray((value as any).values) && (value as any).values.length > 0) {
      return digestHexFromValue((value as any).values[0]);
    }
    if ((value as any).value !== undefined) return digestHexFromValue((value as any).value);
    if ((value as any).val !== undefined) return digestHexFromValue((value as any).val);
  }

  return '';
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err ?? '');
}

function isAlreadyCommittedTranscriptError(err: unknown): boolean {
  const msg = errorMessage(err);
  return msg.includes('Error(Contract, #10)') || msg.includes('AlreadyCommittedTranscript');
}

function isSwitchDecodeError(err: unknown): boolean {
  const msg = errorMessage(err);
  return msg.includes("reading 'switch'");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function transcriptToBytes(transcriptJson: string, shotsPerTurn: number): Uint8Array {
  if (!transcriptJson) return new Uint8Array();
  let arr: any[] = [];
  try {
    const parsed = JSON.parse(transcriptJson);
    if (Array.isArray(parsed)) arr = parsed;
  } catch {
    return new Uint8Array();
  }

  const complete = arr
    .filter((e) => typeof e?.turn === 'number' && Array.isArray(e?.shots) && Array.isArray(e?.results))
    .sort((a, b) => (a.turn ?? 0) - (b.turn ?? 0));

  // Each shot encodes x,y,hit (3 bytes).
  const perTurnBytes = shotsPerTurn * 3;
  const out = new Uint8Array(complete.length * perTurnBytes);
  let o = 0;
  for (const e of complete) {
    for (let i = 0; i < shotsPerTurn; i++) {
      const s = e.shots[i];
      const r = e.results[i];
      const x = Number(s?.x ?? 0);
      const y = Number(s?.y ?? 0);
      const hit = r?.hit ? 1 : 0;
      out[o++] = x & 0xff;
      out[o++] = y & 0xff;
      out[o++] = hit & 0xff;
    }
  }
  return out;
}

function makeBoolGrid(size: number, value = false): boolean[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => value));
}

function makeCellGrid(size: number, value: CellState = 0): CellState[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => value));
}

function countTrue(board: boolean[][]): number {
  let n = 0;
  for (let y = 0; y < board.length; y++) {
    for (let x = 0; x < board[y].length; x++) {
      if (board[y][x]) n++;
    }
  }
  return n;
}

function randomizeBoard(size: number, cells: number): boolean[][] {
  const out = makeBoolGrid(size, false);
  const picks = new Set<number>();
  while (picks.size < cells) {
    picks.add(Math.floor(Math.random() * size * size));
  }
  for (const idx of picks) {
    const y = Math.floor(idx / size);
    const x = idx % size;
    out[y][x] = true;
  }
  return out;
}

function storageKey(sessionId: number, address: string) {
  return `zkbs:board:${sessionId}:${address}`;
}

function normalizeActorId(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase();
}

function randomSessionId() {
  return Math.floor(Math.random() * 1_000_000_000);
}

function h2hKey(mode: H2HMode, me: string, opponent: string): string {
  return `zkbs:h2h:${mode}:${normalizeActorId(me)}:${normalizeActorId(opponent)}`;
}

function h2hSessionGuardKey(sessionId: number, me: string): string {
  return `zkbs:h2h:session:${sessionId}:${normalizeActorId(me)}`;
}

function readH2HStats(mode: H2HMode, me: string, opponent: string): H2HStats {
  const key = h2hKey(mode, me, opponent);
  const fallback: H2HStats = {
    games: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    lastResult: null,
    updatedAt: 0,
  };
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      games: Number(parsed?.games ?? 0) || 0,
      wins: Number(parsed?.wins ?? 0) || 0,
      losses: Number(parsed?.losses ?? 0) || 0,
      draws: Number(parsed?.draws ?? 0) || 0,
      lastResult:
        parsed?.lastResult === 'W' || parsed?.lastResult === 'L' || parsed?.lastResult === 'D'
          ? parsed.lastResult
          : null,
      updatedAt: Number(parsed?.updatedAt ?? 0) || 0,
    };
  } catch {
    return fallback;
  }
}

function writeH2HStats(mode: H2HMode, me: string, opponent: string, stats: H2HStats): void {
  localStorage.setItem(h2hKey(mode, me, opponent), JSON.stringify(stats));
}

export default function MatchScene() {
  const { setScene, activeMatch, setActiveMatch, clearActiveMatch } = useGameStore();
  const { connected, address, signer, supportsSignAuthEntry } = useStellarWallet();

  const service = useMemo(() => new ZkBattleshipService(), []);
  const reduceMotion = useReducedMotion();

  const sessionId = activeMatch?.sessionId ?? 0;
  const activeSessionId = activeMatch?.sessionId;
  const modeId = activeMatch?.modeId ?? MODE_CLASSIC;
  const isBotMatch = !!activeMatch?.isBotMatch;

  const relay = useRelay({ sessionId, address, modeId });

  const [sessionExists, setSessionExists] = useState<boolean | null>(null);
  const [commitments, setCommitments] = useState<{ p1: boolean; p2: boolean }>({
    p1: false,
    p2: false,
  });
  const [transcriptCommits, setTranscriptCommits] = useState<{ p1: boolean; p2: boolean }>({
    p1: false,
    p2: false,
  });
  const [onChainTranscriptHex, setOnChainTranscriptHex] = useState<{ p1: string; p2: string }>({
    p1: '',
    p2: '',
  });

  const [myBoard, setMyBoard] = useState<boolean[][]>(() => makeBoolGrid(GRID_SIZE, false));
  const [enemyBoard, setEnemyBoard] = useState<CellState[][]>(() => makeCellGrid(GRID_SIZE, 0));
  const [incoming, setIncoming] = useState<CellState[][]>(() => makeCellGrid(GRID_SIZE, 0));

  const [saltHex, setSaltHex] = useState<string>('');
  const [commitmentHex, setCommitmentHex] = useState<string>('');
  const [committing, setCommitting] = useState(false);

  const [committingTranscript, setCommittingTranscript] = useState(false);

  const [turn, setTurn] = useState(0);
  const [pendingTurn, setPendingTurn] = useState<number | null>(null);
  const [selected, setSelected] = useState<Shot[]>([]);
  const [transcriptJson, setTranscriptJson] = useState<string>('');
  const [transcriptBytesHex, setTranscriptBytesHex] = useState<string>('');
  const [transcriptDigestHex, setTranscriptDigestHex] = useState<string>('');

  const [settleSealHex, setSettleSealHex] = useState<string>('');
  const [settleJournalHex, setSettleJournalHex] = useState<string>('');
  const [settling, setSettling] = useState(false);
  const [settleMessage, setSettleMessage] = useState<string>('');
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [showRematchRequestModal, setShowRematchRequestModal] = useState(false);
  const [resolvedOutcome, setResolvedOutcome] = useState<'victory' | 'defeat' | null>(null);
  const [showPresenceModal, setShowPresenceModal] = useState(false);
  const [presenceModalMode, setPresenceModalMode] = useState<'waiting' | 'joined'>('waiting');
  const [showCommitWaitModal, setShowCommitWaitModal] = useState(false);
  const [commitWaitMessage, setCommitWaitMessage] = useState('Waiting for opponent to commit board.');
  const [showBoardCommittedModal, setShowBoardCommittedModal] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeSubmitted, setFinalizeSubmitted] = useState(false);
  const [showAdvanced] = useState(false);
  const [settleStatus, setSettleStatus] = useState<SettleStatusPayload | null>(null);
  const [fireFeedbackState, setFireFeedbackState] = useState<'idle' | 'launching' | 'awaiting' | 'resolved'>('idle');
  const [h2hStats, setH2hStats] = useState<H2HStats | null>(null);
  const [copiedKey, setCopiedKey] = useState<CopyFeedbackKey | null>(null);
  const [recentEnemyImpacts, setRecentEnemyImpacts] = useState<Set<string>>(new Set());
  const [recentIncomingImpacts, setRecentIncomingImpacts] = useState<Set<string>>(new Set());
  const [pendingRematchOffer, setPendingRematchOffer] = useState<RematchOfferPayload | null>(null);
  const [rematchAction, setRematchAction] = useState<
    'idle' | 'offering' | 'waiting' | 'accepting' | 'starting' | 'bot_starting'
  >('idle');
  const [rematchMessage, setRematchMessage] = useState('');

  const myBoardRef = useRef(myBoard);
  const turnRef = useRef(turn);
  const pendingTurnRef = useRef(pendingTurn);
  const selectedRef = useRef(selected);
  const commitmentsRef = useRef(commitments);
  const hasObservedGameplayRef = useRef(false);
  const settlePanelRef = useRef<HTMLDivElement | null>(null);
  const copyFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitWaitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boardCommittedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const outcomeAutoCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fireFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enemyImpactTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const incomingImpactTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hadPeerRef = useRef(false);
  const waitingDismissedRef = useRef(false);

  useEffect(() => { myBoardRef.current = myBoard; }, [myBoard]);
  useEffect(() => { turnRef.current = turn; }, [turn]);
  useEffect(() => { pendingTurnRef.current = pendingTurn; }, [pendingTurn]);
  useEffect(() => { selectedRef.current = selected; }, [selected]);
  useEffect(() => { commitmentsRef.current = commitments; }, [commitments]);
  useEffect(() => {
    if (turn > 0 || pendingTurn !== null || !!transcriptJson) {
      hasObservedGameplayRef.current = true;
    }
  }, [turn, pendingTurn, transcriptJson]);
  useEffect(() => {
    return () => {
      if (copyFeedbackTimeoutRef.current) clearTimeout(copyFeedbackTimeoutRef.current);
      if (commitWaitTimeoutRef.current) clearTimeout(commitWaitTimeoutRef.current);
      if (boardCommittedTimeoutRef.current) clearTimeout(boardCommittedTimeoutRef.current);
      if (outcomeAutoCloseTimeoutRef.current) clearTimeout(outcomeAutoCloseTimeoutRef.current);
      if (fireFeedbackTimeoutRef.current) clearTimeout(fireFeedbackTimeoutRef.current);
      if (enemyImpactTimeoutRef.current) clearTimeout(enemyImpactTimeoutRef.current);
      if (incomingImpactTimeoutRef.current) clearTimeout(incomingImpactTimeoutRef.current);
    };
  }, []);

  const isPlayer1 = !!(address && activeMatch && address === activeMatch.player1);
  const isPlayer2 = !!(address && activeMatch && activeMatch.player2 && address === activeMatch.player2);
  const isParticipant = isPlayer1 || isPlayer2 || (isPlayer1 && !activeMatch?.player2);
  const myRole = isPlayer1 ? ('p1' as const) : isPlayer2 ? ('p2' as const) : null;
  const opponentAddress =
    !activeMatch || !address
      ? null
      : isPlayer1
        ? (activeMatch.player2 ?? null)
        : activeMatch.player1;

  const shotsPerTurn = modeId === MODE_SALVO ? 2 : 1;
  const isMyTurn =
    !!activeMatch &&
    !!address &&
    ((turn % 2 === 0 && address === activeMatch.player1) ||
      (turn % 2 === 1 && !!activeMatch.player2 && address === activeMatch.player2));

  const shipsPlaced = countTrue(myBoard);
  const myHitsTaken = useMemo(() => {
    let n = 0;
    for (let y = 0; y < incoming.length; y++) {
      for (let x = 0; x < incoming[y].length; x++) {
        if (incoming[y][x] === 2) n++;
      }
    }
    return n;
  }, [incoming]);
  const myHitsOnEnemy = useMemo(() => {
    let n = 0;
    for (let y = 0; y < enemyBoard.length; y++) {
      for (let x = 0; x < enemyBoard[y].length; x++) {
        if (enemyBoard[y][x] === 2) n++;
      }
    }
    return n;
  }, [enemyBoard]);

  const statusText = useMemo(() => {
    if (!activeMatch) return 'No active match selected.';
    if (!connected || !address) return 'Connect a Stellar wallet to play.';
    if (!isParticipant) return 'This wallet is not a participant in the active match.';
    if (myHitsOnEnemy >= SHIP_CELLS) return 'Victory (local)';
    if (myHitsTaken >= SHIP_CELLS) return 'Defeat (local)';
    if (pendingTurn !== null) return 'Awaiting result...';
    if (isMyTurn) return 'Your turn';
    return 'Opponent turn';
  }, [activeMatch, connected, address, isParticipant, myHitsOnEnemy, myHitsTaken, pendingTurn, isMyTurn]);

  useEffect(() => {
    if (!activeSessionId || !address || !activeMatch) return;
    // Always reset local board/move/transcript state when switching sessions.
    setMyBoard(makeBoolGrid(GRID_SIZE, false));
    setEnemyBoard(makeCellGrid(GRID_SIZE, 0));
    setIncoming(makeCellGrid(GRID_SIZE, 0));
    setSelected([]);
    setTurn(0);
    setPendingTurn(null);
    setSaltHex('');
    setCommitmentHex('');
    setTranscriptJson('');
    setTranscriptBytesHex('');
    setTranscriptDigestHex('');
    try {
      const raw = localStorage.getItem(storageKey(activeMatch.sessionId, address));
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.size !== GRID_SIZE) return;
      if (Array.isArray(parsed?.board) && parsed.board.length === GRID_SIZE) setMyBoard(parsed.board);
      if (typeof parsed?.saltHex === 'string') setSaltHex(parsed.saltHex);
      if (typeof parsed?.commitmentHex === 'string') setCommitmentHex(parsed.commitmentHex);
      if (typeof parsed?.turn === 'number') setTurn(parsed.turn);
      if (Array.isArray(parsed?.enemyBoard)) setEnemyBoard(parsed.enemyBoard);
      if (Array.isArray(parsed?.incoming)) setIncoming(parsed.incoming);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMatch?.sessionId, address]);

  useEffect(() => {
    if (!activeMatch || !address) return;
    const payload = {
      size: GRID_SIZE,
      board: myBoard,
      saltHex,
      commitmentHex,
      turn,
      enemyBoard,
      incoming,
    };
    localStorage.setItem(storageKey(activeMatch.sessionId, address), JSON.stringify(payload));
  }, [activeMatch, address, myBoard, saltHex, commitmentHex, turn, enemyBoard, incoming]);

  useEffect(() => {
    if (!activeMatch) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const pk = address || activeMatch.player1;
        const s = await service.getSession(activeMatch.sessionId, pk);
        if (cancelled) return;
        if (!s) {
          const hadReliableProgress =
            hasObservedGameplayRef.current ||
            commitmentsRef.current.p1 ||
            commitmentsRef.current.p2;
          if (hadReliableProgress) {
            // RPC/indexing can temporarily miss an already-started session.
            // Once we have reliable local/on-chain progress signals, keep session as found.
            setSessionExists(true);
            return;
          }
          setSessionExists(false);
          setCommitments({ p1: false, p2: false });
          setTranscriptCommits({ p1: false, p2: false });
          setOnChainTranscriptHex({ p1: '', p2: '' });
          return;
        }
        setSessionExists(true);
        setCommitments((prev) => ({
          p1: prev.p1 || !!(s as any).player1_commitment,
          p2: prev.p2 || !!(s as any).player2_commitment,
        }));

        const p1DigestHex = digestHexFromValue((s as any).player1_transcript_digest);
        const p2DigestHex = digestHexFromValue((s as any).player2_transcript_digest);
        setTranscriptCommits({ p1: !!p1DigestHex, p2: !!p2DigestHex });
        setOnChainTranscriptHex({
          p1: p1DigestHex,
          p2: p2DigestHex,
        });
      } catch {
        if (cancelled) return;
        const hadReliableProgress =
          hasObservedGameplayRef.current ||
          commitmentsRef.current.p1 ||
          commitmentsRef.current.p2;
        if (hadReliableProgress) {
          setSessionExists(true);
          return;
        }
        setSessionExists(null);
      }
    };
    poll();
    const id = window.setInterval(poll, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [activeMatch, address, service]);

  useEffect(() => {
    if (!activeMatch || !address) return;

    const appendTranscript = (entry: any) => {
      setTranscriptJson((prev) => {
        try {
          const arr = prev ? JSON.parse(prev) : [];
          const next = Array.isArray(arr) ? arr : [];
          const idx = next.findIndex((x: any) => x?.turn === entry.turn);
          if (idx === -1) next.push(entry);
          else next[idx] = { ...next[idx], ...entry };
          next.sort((a: any, b: any) => (a.turn ?? 0) - (b.turn ?? 0));
          return JSON.stringify(next);
        } catch {
          return JSON.stringify([entry]);
        }
      });
    };

    const handleMove = (payload: MoveRecvPayload) => {
      if (!payload || payload.sessionId !== sessionId) return;
      if (payload.from === address) return;
      if (pendingTurnRef.current !== null) return;
      if (payload.turn !== turnRef.current) return;

      const board = myBoardRef.current;
      const results = payload.shots.map((s) => {
        const hit = !!board[s.y]?.[s.x];
        return { ...s, hit };
      });
      flashIncomingImpacts(results);

      setIncoming((prev) => {
        const next = prev.map((row) => row.slice()) as CellState[][];
        for (const r of results) {
          if (r.x < 0 || r.x >= GRID_SIZE || r.y < 0 || r.y >= GRID_SIZE) continue;
          next[r.y][r.x] = r.hit ? 2 : 1;
        }
        return next;
      });

      appendTranscript({
        turn: payload.turn,
        attacker: payload.from,
        shots: payload.shots,
        results,
      });

      relay.sendMoveResult({
        sessionId,
        from: address,
        turn: payload.turn,
        results,
      });

      setTurn((t) => t + 1);
    };

    const handleMoveResult = (payload: MoveResultPayload) => {
      if (!payload || payload.sessionId !== sessionId) return;
      if (payload.turn !== pendingTurnRef.current) return;
      flashEnemyImpacts(payload.results);

      setEnemyBoard((prev) => {
        const next = prev.map((row) => row.slice()) as CellState[][];
        for (const r of payload.results) {
          if (r.x < 0 || r.x >= GRID_SIZE || r.y < 0 || r.y >= GRID_SIZE) continue;
          next[r.y][r.x] = r.hit ? 2 : 1;
        }
        return next;
      });

      appendTranscript({
        turn: payload.turn,
        results: payload.results,
      });

      setPendingTurn(null);
      setTurn((t) => t + 1);
      setFireFeedbackState('resolved');
      if (fireFeedbackTimeoutRef.current) clearTimeout(fireFeedbackTimeoutRef.current);
      fireFeedbackTimeoutRef.current = setTimeout(() => {
        setFireFeedbackState('idle');
        fireFeedbackTimeoutRef.current = null;
      }, 520);
    };

    const offMove = relay.onMove(handleMove);
    const offResult = relay.onMoveResult(handleMoveResult);
    return () => {
      offMove();
      offResult();
    };
  }, [activeMatch, activeSessionId, sessionId, address, relay, relay.onMove, relay.onMoveResult, relay.sendMoveResult]);

  useEffect(() => {
    if (!activeSessionId || !address) return;
    const sid = activeSessionId;
    const off = relay.onSettleStatus((payload) => {
      if (!payload) return;
      if (String(payload.sessionId) !== String(sid)) return;
      setSettleStatus(payload);
    });

    void (async () => {
      const resp = await relay.getSettleInfo();
      if (resp.ok && resp.status) setSettleStatus(resp.status);
    })();

    return () => {
      off();
    };
  }, [activeMatch, activeSessionId, address, relay, relay.onSettleStatus, relay.getSettleInfo]);

  useEffect(() => {
    if (!activeSessionId || !address) return;
    const sid = Number(activeSessionId);

    const offOffer = relay.onRematchOffer((payload) => {
      if (!payload || Number(payload.sessionId) !== sid) return;
      if (Number(payload.expiresAt) <= Date.now()) return;

      setPendingRematchOffer(payload);
      if (normalizeActorId(payload.from) === normalizeActorId(address)) {
        setRematchAction('waiting');
        setRematchMessage('Rematch request sent. Waiting for opponent...');
      } else {
        setRematchAction('idle');
        setRematchMessage('Opponent requested a rematch.');
        setShowRematchRequestModal(true);
      }
    });

    const offDeclined = relay.onRematchDeclined((payload) => {
      if (!payload || Number(payload.sessionId) !== sid) return;
      setPendingRematchOffer(null);
      setRematchAction('idle');
      setRematchMessage('Rematch request declined.');
      setShowRematchRequestModal(false);
    });

    const offCanceled = relay.onRematchCanceled((payload) => {
      if (!payload || Number(payload.sessionId) !== sid) return;
      setPendingRematchOffer(null);
      setRematchAction('idle');
      setRematchMessage('Rematch request canceled.');
      setShowRematchRequestModal(false);
    });

    const offStarted = relay.onRematchStarted((payload: RematchStartedPayload) => {
      if (!payload || Number(payload.sessionId) !== sid) return;
      setPendingRematchOffer(null);
      setRematchAction('starting');
      setRematchMessage('Rematch started. Loading next match...');
      setShowRematchRequestModal(false);
      setActiveMatch({
        sessionId: Number(payload.newSessionId),
        modeId: Number(payload.modeId) === 1 ? MODE_SALVO : MODE_CLASSIC,
        player1: String(payload.player1),
        player2: String(payload.player2),
        isBotMatch: false,
      });
      setScene('match');
    });

    return () => {
      offOffer();
      offDeclined();
      offCanceled();
      offStarted();
    };
  }, [
    activeSessionId,
    address,
    relay,
    relay.onRematchOffer,
    relay.onRematchDeclined,
    relay.onRematchCanceled,
    relay.onRematchStarted,
    setActiveMatch,
    setScene,
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const bytes = transcriptToBytes(transcriptJson, shotsPerTurn);
      if (cancelled) return;
      setTranscriptBytesHex(bytesToHex(bytes));

      const digest = new Uint8Array(
        await crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource)
      );
      if (cancelled) return;
      setTranscriptDigestHex(bytesToHex(digest));
    })();
    return () => {
      cancelled = true;
    };
  }, [transcriptJson, shotsPerTurn]);

  const copy = async (text: string, feedbackKey?: CopyFeedbackKey) => {
    await navigator.clipboard.writeText(text);
    if (!feedbackKey) return;
    setCopiedKey(feedbackKey);
    if (copyFeedbackTimeoutRef.current) clearTimeout(copyFeedbackTimeoutRef.current);
    copyFeedbackTimeoutRef.current = setTimeout(() => {
      setCopiedKey((curr) => (curr === feedbackKey ? null : curr));
      copyFeedbackTimeoutRef.current = null;
    }, 1500);
  };

  const pasteProofJson = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = JSON.parse(text);
      const seal = parsed?.seal_hex ?? parsed?.sealHex ?? '';
      const journal = parsed?.journal_hex ?? parsed?.journalHex ?? '';
      if (typeof seal !== 'string' || typeof journal !== 'string' || !seal || !journal) {
        throw new Error('Clipboard JSON is missing seal_hex/journal_hex');
      }
      setSettleSealHex(seal);
      setSettleJournalHex(journal);
      setSettleMessage('Loaded seal/journal from clipboard proof JSON.');
    } catch (err: any) {
      console.error(err);
      setSettleMessage(err?.message ? `Paste failed: ${err.message}` : 'Paste failed.');
    }
  };

  const myBoardCommitted = isPlayer1 ? commitments.p1 : isPlayer2 ? commitments.p2 : false;
  const canEditBoard =
    pendingTurn === null && myHitsTaken < SHIP_CELLS && myHitsOnEnemy < SHIP_CELLS && !myBoardCommitted;
  const canCommit =
    connected &&
    !!address &&
    sessionExists === true &&
    shipsPlaced === SHIP_CELLS &&
    !committing &&
    !myBoardCommitted;
  const canFire =
    connected &&
    !!address &&
    commitments.p1 &&
    commitments.p2 &&
    relay.connected &&
    pendingTurn === null &&
    isMyTurn &&
    selected.length === shotsPerTurn &&
    myHitsTaken < SHIP_CELLS &&
    myHitsOnEnemy < SHIP_CELLS;
  const bothBoardsCommitted = commitments.p1 && commitments.p2;
  const myBoardLocked = myBoardCommitted;
  const enemyBoardLocked = !bothBoardsCommitted;
  const waitingForOpponentFire =
    bothBoardsCommitted &&
    pendingTurn === null &&
    !isMyTurn &&
    isParticipant &&
    myHitsTaken < SHIP_CELLS &&
    myHitsOnEnemy < SHIP_CELLS;
  const canSelectTargets =
    !enemyBoardLocked &&
    pendingTurn === null &&
    isMyTurn &&
    connected &&
    !!address &&
    myHitsOnEnemy < SHIP_CELLS &&
    myHitsTaken < SHIP_CELLS;

  function flashEnemyImpacts(results: Array<Shot & { hit: boolean }>) {
    const keys = new Set(results.map((r) => impactKey(r.x, r.y)));
    setRecentEnemyImpacts(keys);
    if (enemyImpactTimeoutRef.current) clearTimeout(enemyImpactTimeoutRef.current);
    enemyImpactTimeoutRef.current = setTimeout(() => {
      setRecentEnemyImpacts(new Set());
      enemyImpactTimeoutRef.current = null;
    }, 260);
  }

  function flashIncomingImpacts(results: Array<Shot & { hit: boolean }>) {
    const keys = new Set(results.map((r) => impactKey(r.x, r.y)));
    setRecentIncomingImpacts(keys);
    if (incomingImpactTimeoutRef.current) clearTimeout(incomingImpactTimeoutRef.current);
    incomingImpactTimeoutRef.current = setTimeout(() => {
      setRecentIncomingImpacts(new Set());
      incomingImpactTimeoutRef.current = null;
    }, 260);
  }

  const flashCommitWaitModal = (message: string) => {
    setCommitWaitMessage(message);
    setShowCommitWaitModal(true);
    if (commitWaitTimeoutRef.current) clearTimeout(commitWaitTimeoutRef.current);
    commitWaitTimeoutRef.current = setTimeout(() => {
      setShowCommitWaitModal(false);
      commitWaitTimeoutRef.current = null;
    }, 1450);
  };

  const flashBoardCommittedModal = () => {
    setShowBoardCommittedModal(true);
    if (boardCommittedTimeoutRef.current) clearTimeout(boardCommittedTimeoutRef.current);
    boardCommittedTimeoutRef.current = setTimeout(() => {
      setShowBoardCommittedModal(false);
      boardCommittedTimeoutRef.current = null;
    }, 1850);
  };

  const myTranscriptCommitted = isPlayer1 ? transcriptCommits.p1 : isPlayer2 ? transcriptCommits.p2 : false;
  const transcriptCommittedByBoth = transcriptCommits.p1 && transcriptCommits.p2;
  const transcriptMatchesOnChain =
    !!onChainTranscriptHex.p1 && !!onChainTranscriptHex.p2 && onChainTranscriptHex.p1 === onChainTranscriptHex.p2;

  const relayerTranscriptDigestHex = settleStatus?.transcriptDigestHex ?? '';
  const relayerDigestBytesLen = useMemo(() => {
    try {
      return hexToBytes(relayerTranscriptDigestHex).length;
    } catch {
      return -1;
    }
  }, [relayerTranscriptDigestHex]);
  const myRelayStatus = myRole
    ? myRole === 'p1'
      ? settleStatus?.p1 ?? null
      : settleStatus?.p2 ?? null
    : null;
  const myFinalizeLockedByRelay = !!myRelayStatus?.commitDone && !!myRelayStatus?.revealed;
  const pendingCommitRoles = useMemo(() => {
    const pending: string[] = [];
    if (!settleStatus?.p1?.commitDone) pending.push('P1');
    if (!settleStatus?.p2?.commitDone) pending.push('P2');
    return pending;
  }, [settleStatus?.p1?.commitDone, settleStatus?.p2?.commitDone]);
  const pendingRevealRoles = useMemo(() => {
    const pending: string[] = [];
    if (!settleStatus?.p1?.revealed) pending.push('P1');
    if (!settleStatus?.p2?.revealed) pending.push('P2');
    return pending;
  }, [settleStatus?.p1?.revealed, settleStatus?.p2?.revealed]);

  const relayerPhase = settleStatus?.phase ?? 'idle';
  const relayerPhaseLabel = relayerPhase === 'idle' ? 'not started' : relayerPhase.split('_').join(' ');
  const relayerIsDone = relayerPhase === 'done';
  const relayerIsBusy = relayerPhase === 'proving' || relayerPhase === 'submitting';
  const relayerIsError = relayerPhase === 'error';
  const finalizeCtaLabel = relayerIsDone
    ? 'FINALIZED'
    : relayerPhase === 'proving'
      ? 'RELAYER PROVING...'
      : relayerPhase === 'submitting'
        ? 'RELAYER SUBMITTING...'
        : finalizing
          ? 'FINALIZING...'
          : finalizeSubmitted || myFinalizeLockedByRelay
            ? 'FINALIZE SUBMITTED'
            : 'FINALIZE ON-CHAIN';

  const outcome =
    resolvedOutcome ??
    (myHitsTaken >= SHIP_CELLS ? ('defeat' as const) : myHitsOnEnemy >= SHIP_CELLS ? ('victory' as const) : null);
  const gameFinishedLocal = outcome !== null;
  const relayPeerLabel = relay.peerAddresses[0] ?? opponentAddress ?? null;
  const h2hMode: H2HMode = isBotMatch ? 'pvc' : 'pvp';
  const h2hOpponentId = isBotMatch
    ? 'computer'
    : normalizeActorId(opponentAddress ?? relay.peerAddresses[0] ?? '');
  const h2hOpponentLabel = isBotMatch ? 'Computer' : relayPeerLabel ?? 'Waiting...';
  const hasIncomingRematchOffer =
    !!pendingRematchOffer &&
    !!address &&
    normalizeActorId(pendingRematchOffer.from) !== normalizeActorId(address);
  const hasOutgoingRematchOffer =
    !!pendingRematchOffer &&
    !!address &&
    normalizeActorId(pendingRematchOffer.from) === normalizeActorId(address);
  const rematchBusy =
    rematchAction === 'offering' ||
    rematchAction === 'accepting' ||
    rematchAction === 'starting' ||
    rematchAction === 'bot_starting';
  const rematchUnlocked = gameFinishedLocal && relayerIsDone;
  const canAcceptIncomingRematch =
    hasIncomingRematchOffer &&
    !rematchBusy;

  useEffect(() => {
    // Reset between matches.
    setShowOutcomeModal(false);
    setResolvedOutcome(null);
    setFinalizeSubmitted(false);
    setSettleMessage('');
    setH2hStats(null);
    setFireFeedbackState('idle');
    setShowPresenceModal(false);
    setShowBoardCommittedModal(false);
    setShowRematchRequestModal(false);
    setSessionExists(null);
    setCommitments({ p1: false, p2: false });
    setTranscriptCommits({ p1: false, p2: false });
    setOnChainTranscriptHex({ p1: '', p2: '' });
    setPresenceModalMode('waiting');
    setPendingRematchOffer(null);
    setRematchAction('idle');
    setRematchMessage('');
    hadPeerRef.current = false;
    waitingDismissedRef.current = false;
    hasObservedGameplayRef.current = false;
    if (outcomeAutoCloseTimeoutRef.current) {
      clearTimeout(outcomeAutoCloseTimeoutRef.current);
      outcomeAutoCloseTimeoutRef.current = null;
    }
  }, [activeMatch?.sessionId]);

  useEffect(() => {
    if (!address || !h2hOpponentId) {
      setH2hStats(null);
      return;
    }
    setH2hStats(readH2HStats(h2hMode, address, h2hOpponentId));
  }, [address, h2hMode, h2hOpponentId, activeMatch?.sessionId]);

  useEffect(() => {
    if (!activeMatch || !address || !h2hOpponentId || !outcome) return;
    const guardKey = h2hSessionGuardKey(activeMatch.sessionId, address);

    let alreadyRecorded = false;
    try {
      const guardRaw = localStorage.getItem(guardKey);
      if (guardRaw) {
        const guard = JSON.parse(guardRaw);
        alreadyRecorded = guard?.mode === h2hMode && guard?.opponentId === h2hOpponentId;
      }
    } catch {
      alreadyRecorded = false;
    }

    if (alreadyRecorded) {
      setH2hStats(readH2HStats(h2hMode, address, h2hOpponentId));
      return;
    }

    const prev = readH2HStats(h2hMode, address, h2hOpponentId);
    const next: H2HStats = {
      ...prev,
      games: prev.games + 1,
      wins: prev.wins + (outcome === 'victory' ? 1 : 0),
      losses: prev.losses + (outcome === 'defeat' ? 1 : 0),
      draws: prev.draws,
      lastResult: outcome === 'victory' ? 'W' : 'L',
      updatedAt: Date.now(),
    };
    writeH2HStats(h2hMode, address, h2hOpponentId, next);
    localStorage.setItem(
      guardKey,
      JSON.stringify({
        mode: h2hMode,
        opponentId: h2hOpponentId,
        outcome,
        updatedAt: next.updatedAt,
      })
    );
    setH2hStats(next);
  }, [activeMatch, address, h2hMode, h2hOpponentId, outcome]);

  useEffect(() => {
    if (myFinalizeLockedByRelay) setFinalizeSubmitted(true);
  }, [myFinalizeLockedByRelay]);

  useEffect(() => {
    if (!gameFinishedLocal || !settleStatus) return;

    if (relayerPhase === 'done') {
      setSettleMessage(settleStatus.txHash ? 'On-chain finalization complete. Transaction confirmed.' : 'On-chain finalization complete.');
      if (showOutcomeModal) {
        if (outcomeAutoCloseTimeoutRef.current) clearTimeout(outcomeAutoCloseTimeoutRef.current);
        outcomeAutoCloseTimeoutRef.current = setTimeout(() => {
          setShowOutcomeModal(false);
          outcomeAutoCloseTimeoutRef.current = null;
        }, 1600);
      }
      return;
    }

    if (relayerPhase === 'submitting') {
      setSettleMessage('Proof ready. Relayer is submitting end_game() on-chain...');
      return;
    }

    if (relayerPhase === 'proving') {
      setSettleMessage('Both players submitted. Relayer is generating the ZK proof...');
      return;
    }

    if (relayerPhase === 'waiting_for_transcript') {
      setSettleMessage('Relayer is building transcript digest from recorded turns...');
      return;
    }

    if (relayerPhase === 'waiting_for_commits') {
      setSettleMessage(
        pendingCommitRoles.length > 0
          ? `Waiting for transcript commits: ${pendingCommitRoles.join(' / ')}.`
          : finalizeSubmitted || myFinalizeLockedByRelay
            ? 'Finalize submitted. Waiting for opponent...'
            : 'Waiting for your finalize submission.'
      );
      return;
    }

    if (relayerPhase === 'waiting_for_reveals') {
      setSettleMessage(
        pendingRevealRoles.length > 0
          ? `Transcript committed. Waiting for board reveals: ${pendingRevealRoles.join(' / ')}.`
          : finalizeSubmitted || myFinalizeLockedByRelay
            ? 'Your commit is recorded. Waiting for opponent reveal...'
            : 'Waiting for your board reveal.'
      );
      return;
    }

    if (relayerPhase === 'error' && settleStatus.error) {
      setSettleMessage(`Relayer error: ${settleStatus.error}`);
    }
  }, [
    gameFinishedLocal,
    settleStatus,
    relayerPhase,
    finalizeSubmitted,
    myFinalizeLockedByRelay,
    pendingCommitRoles,
    pendingRevealRoles,
    showOutcomeModal,
  ]);

  useEffect(() => {
    if (resolvedOutcome) return;
    if (myHitsTaken >= SHIP_CELLS) {
      setResolvedOutcome('defeat');
      return;
    }
    if (myHitsOnEnemy >= SHIP_CELLS) {
      setResolvedOutcome('victory');
    }
  }, [resolvedOutcome, myHitsTaken, myHitsOnEnemy]);

  useEffect(() => {
    if (outcome) setShowOutcomeModal(true);
  }, [outcome]);

  useEffect(() => {
    if (gameFinishedLocal || !activeMatch || !address) {
      setShowPresenceModal(false);
      return;
    }

    const hasPeerNow = relay.peerAddresses.length > 0;
    const hadPeer = hadPeerRef.current;

    if (!hadPeer && !hasPeerNow && !waitingDismissedRef.current) {
      setPresenceModalMode('waiting');
      setShowPresenceModal(true);
    }

    if (!hadPeer && hasPeerNow) {
      waitingDismissedRef.current = false;
      setPresenceModalMode('joined');
      setShowPresenceModal(true);
    }

    if (hadPeer && !hasPeerNow) {
      waitingDismissedRef.current = false;
      setPresenceModalMode('waiting');
      setShowPresenceModal(true);
    }

    hadPeerRef.current = hasPeerNow;
  }, [activeMatch, address, gameFinishedLocal, relay.peerAddresses]);

  const closePresenceModal = () => {
    if (presenceModalMode === 'waiting') waitingDismissedRef.current = true;
    setShowPresenceModal(false);
  };

  const copyProverInputTemplate = async () => {
    if (!activeMatch || !address) return;
    const settleInfo = await relay.getSettleInfo();
    const transcriptHex =
      settleInfo.ok && typeof settleInfo.transcriptHex === 'string' && settleInfo.transcriptHex
        ? settleInfo.transcriptHex
        : transcriptBytesHex;
    const bitsHex = bytesToHex(encodeBoardBits(myBoard));
    const template: any = {
      session_id: activeMatch.sessionId,
      mode_id: modeId,
      p1_salt_hex: isPlayer1 ? saltHex : '',
      p1_board_bits_hex: isPlayer1 ? bitsHex : '',
      p2_salt_hex: isPlayer2 ? saltHex : '',
      p2_board_bits_hex: isPlayer2 ? bitsHex : '',
      transcript_hex: transcriptHex,
    };
    await copy(JSON.stringify(template, null, 2), 'proverInput');
    setSettleMessage('Copied prover input template JSON to clipboard.');
  };

  const offerPvPRematch = async () => {
    if (!activeMatch || !address || !signer) return;
    if (!supportsSignAuthEntry) {
      setRematchMessage('This wallet cannot sign auth entries for rematch invites. Use Freighter for rematch.');
      return;
    }
    const target = opponentAddress ?? relay.peerAddresses[0] ?? '';
    if (!target) {
      setRematchMessage('Opponent not connected. Wait for them, then try rematch.');
      return;
    }
    setRematchAction('offering');
    setRematchMessage('');
    try {
      const nextSessionId = randomSessionId();
      const authEntryXdr = await service.prepareStartGame(
        nextSessionId,
        modeId,
        address,
        target,
        BigInt(0),
        BigInt(0),
        signer
      );
      const offered = await relay.offerRematch({
        newSessionId: nextSessionId,
        modeId,
        to: target,
        authEntryXdr,
      });
      if (!offered.ok) throw new Error(offered.error ?? 'Could not send rematch request.');

      const localOffer: RematchOfferPayload = offered.offer ?? {
        sessionId,
        modeId,
        newSessionId: nextSessionId,
        from: address,
        to: target,
        authEntryXdr,
        createdAt: Date.now(),
        expiresAt: Date.now() + 5 * 60 * 1000,
      };
      setPendingRematchOffer(localOffer);
      setRematchAction('waiting');
      setRematchMessage('Rematch request sent. Waiting for opponent...');
    } catch (err: any) {
      setRematchAction('idle');
      setRematchMessage(err?.message ?? 'Failed to create rematch request.');
    }
  };

  const acceptPvPRematch = async () => {
    if (!pendingRematchOffer || !address || !signer) return;
    if (!supportsSignAuthEntry) {
      setRematchMessage('This wallet cannot sign auth entries required to accept rematch.');
      return;
    }
    if (Number(pendingRematchOffer.expiresAt) <= Date.now()) {
      setPendingRematchOffer(null);
      setRematchAction('idle');
      setRematchMessage('Rematch invite expired. Ask for a new rematch.');
      return;
    }
    setRematchAction('accepting');
    setRematchMessage('');
    try {
      const nextMatch = {
        sessionId: Number(pendingRematchOffer.newSessionId),
        modeId: Number(pendingRematchOffer.modeId) === 1 ? MODE_SALVO : MODE_CLASSIC,
        player1: String(pendingRematchOffer.from),
        player2: String(address),
        isBotMatch: false,
      } as const;

      const txXdr = await service.importAndSignAuthEntry(
        pendingRematchOffer.authEntryXdr,
        address,
        BigInt(0),
        signer
      );
      setRematchAction('starting');
      const sent = await service.finalizeStartGame(txXdr, address, signer);
      const txHash = String((sent as any)?.hash ?? (sent as any)?.result?.hash ?? '').trim();

      let announced = { ok: false, error: 'Relay request timed out after 30s.' } as { ok: boolean; error?: string };
      for (let attempt = 0; attempt < 3; attempt += 1) {
        announced = await relay.announceRematchStarted({
          newSessionId: pendingRematchOffer.newSessionId,
          modeId: pendingRematchOffer.modeId,
          player1: pendingRematchOffer.from,
          player2: address,
          txHash,
        });
        if (announced.ok) break;
        const errText = String(announced.error ?? '');
        // Retry on transient relay transport stalls/timeouts.
        if (!/timed out|relay not connected|connect/i.test(errText)) break;
        await sleep(1200);
      }
      if (!announced.ok) {
        setRematchMessage(
          announced.error
            ? `Rematch started on-chain, but relay sync failed: ${announced.error}`
            : 'Rematch started on-chain, but relay sync failed.'
        );
      }
      setPendingRematchOffer(null);
      setShowRematchRequestModal(false);
      setRematchAction('starting');
      setActiveMatch(nextMatch);
      setScene('match');
    } catch (err: any) {
      setRematchAction('idle');
      setRematchMessage(err?.message ?? 'Failed to accept rematch.');
    }
  };

  useEffect(() => {
    if (!pendingRematchOffer || !address) return;
    const mine = normalizeActorId(pendingRematchOffer.from) === normalizeActorId(address);
    if (!mine) return;
    let cancelled = false;

    const pollStarted = async () => {
      try {
        const nextSid = Number(pendingRematchOffer.newSessionId);
        const session = await service.getSession(nextSid, address);
        if (cancelled || !session) return;
        setPendingRematchOffer(null);
        setRematchAction('starting');
        setRematchMessage('Opponent accepted rematch. Loading next match...');
        setActiveMatch({
          sessionId: nextSid,
          modeId: Number(pendingRematchOffer.modeId) === 1 ? MODE_SALVO : MODE_CLASSIC,
          player1: String(pendingRematchOffer.from),
          player2: String(pendingRematchOffer.to ?? opponentAddress ?? relay.peerAddresses[0] ?? ''),
          isBotMatch: false,
        });
        setScene('match');
      } catch {
        // keep polling
      }
    };

    pollStarted();
    const id = window.setInterval(pollStarted, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pendingRematchOffer, address, service, setActiveMatch, setScene, opponentAddress, relay.peerAddresses]);

  const declinePvPRematch = async () => {
    if (!pendingRematchOffer) return;
    const resp = await relay.declineRematch({ newSessionId: pendingRematchOffer.newSessionId });
    if (!resp.ok) {
      setRematchMessage(resp.error ?? 'Failed to decline rematch.');
      return;
    }
    setPendingRematchOffer(null);
    setRematchAction('idle');
    setRematchMessage('Rematch declined.');
    setShowRematchRequestModal(false);
  };

  const cancelPvPRematch = async () => {
    if (!pendingRematchOffer) return;
    const resp = await relay.cancelRematch({ newSessionId: pendingRematchOffer.newSessionId });
    if (!resp.ok) {
      setRematchMessage(resp.error ?? 'Failed to cancel rematch.');
      return;
    }
    setPendingRematchOffer(null);
    setRematchAction('idle');
    setRematchMessage('Rematch request canceled.');
  };

  const startBotRematch = async () => {
    if (!activeMatch || !address || !signer) return;
    if (!supportsSignAuthEntry) {
      setRematchMessage('This wallet cannot sign auth entries required for bot rematch.');
      return;
    }
    setRematchAction('bot_starting');
    setRematchMessage('');
    try {
      const botInfo = await relay.getBotInfo();
      const botAddress = String(botInfo?.botAddress ?? '');
      if (!botInfo.ok || !botAddress) {
        throw new Error(botInfo.error ?? 'Relay bot address is unavailable.');
      }

      const nextSessionId = randomSessionId();
      const authEntryXdr = await service.prepareStartGame(
        nextSessionId,
        modeId,
        address,
        botAddress,
        BigInt(0),
        BigInt(0),
        signer
      );

      const started = await relay.startBotMatch({ player1AuthEntryXdr: authEntryXdr });
      if (!started.ok) throw new Error(started.error ?? 'Failed to start bot rematch.');

      setPendingRematchOffer(null);
      setRematchAction('starting');
      setRematchMessage('Rematch started. Loading next match...');
      setActiveMatch({
        sessionId: Number(started.sessionId ?? nextSessionId),
        modeId: Number(started.modeId ?? modeId) === 1 ? MODE_SALVO : MODE_CLASSIC,
        player1: String(started.player1 ?? address),
        player2: String(started.player2 ?? botAddress),
        isBotMatch: true,
      });
      setScene('match');
    } catch (err: any) {
      setRematchAction('idle');
      setRematchMessage(err?.message ?? 'Failed to start bot rematch.');
    }
  };

  const renderRematchControls = (scope: 'modal' | 'panel') => {
    const size = scope === 'modal' ? ('sm' as const) : ('sm' as const);
    const disabledTone = !rematchUnlocked ? 'grayscale' : '';

    if (isBotMatch) {
      return (
        <MedievalButton
          variant="gold"
          size={size}
          className={disabledTone}
          disabled={rematchBusy || !connected || !address || !signer || !rematchUnlocked}
          onClick={startBotRematch}
        >
          {rematchAction === 'bot_starting' || rematchAction === 'starting'
            ? 'STARTING REMATCH...'
            : 'REMATCH VS COMPUTER'}
        </MedievalButton>
      );
    }

    if (hasIncomingRematchOffer) {
      return (
        <MedievalButton
          variant="gold"
          size={size}
          onClick={() => setShowRematchRequestModal(true)}
        >
          REMATCH REQUEST
        </MedievalButton>
      );
    }

    if (hasOutgoingRematchOffer) {
      return (
        <>
          <MedievalButton variant="secondary" size={size} disabled>
            REMATCH REQUESTED
          </MedievalButton>
          <MedievalButton
            variant="secondary"
            size={size}
            disabled={rematchBusy}
            onClick={cancelPvPRematch}
          >
            CANCEL REMATCH
          </MedievalButton>
        </>
      );
    }

    return (
      <MedievalButton
        variant="gold"
        size={size}
        className={disabledTone}
        disabled={
          rematchBusy ||
          !rematchUnlocked ||
          !connected ||
          !address ||
          !signer ||
          !supportsSignAuthEntry ||
          !relay.connected ||
          !(opponentAddress ?? relay.peerAddresses[0])
        }
        onClick={offerPvPRematch}
      >
        {rematchAction === 'offering' ? 'REQUESTING...' : 'REMATCH'}
      </MedievalButton>
    );
  };

  const canCommitTranscript =
    connected &&
    !!address &&
    !!signer &&
    sessionExists === true &&
    commitments.p1 &&
    commitments.p2 &&
    gameFinishedLocal &&
    relay.connected &&
    !!myRole &&
    relayerDigestBytesLen === 32 &&
    !committingTranscript &&
    !myTranscriptCommitted;

  const canFinalizeOnChain =
    connected &&
    !!address &&
    !!signer &&
    !!activeMatch &&
    sessionExists === true &&
    gameFinishedLocal &&
    relay.connected &&
    !!myRole &&
    !finalizing &&
    !finalizeSubmitted &&
    !myFinalizeLockedByRelay &&
    !relayerIsBusy &&
    !relayerIsDone;

  const finalizeOnChain = async () => {
    if (!activeMatch || !address || !signer) return;
    if (!relay.connected) {
      setSettleMessage('Relay not connected.');
      return;
    }
    if (!myRole) {
      setSettleMessage('This wallet is not a participant in the active match.');
      return;
    }

    setSettleMessage('');
    setFinalizing(true);
    try {
      const info = await relay.getSettleInfo();
      if (!info.ok) {
        throw new Error(info.error ?? 'Failed to fetch settlement info from relay.');
      }

      const digestHex = String(info.transcriptDigestHex ?? '');
      if (!digestHex) {
        throw new Error('Transcript not ready yet. Try again in a moment.');
      }

      const digestBytes = hexToBytes(digestHex);
      if (digestBytes.length !== 32) {
        throw new Error('Relayer transcript digest is invalid (expected 32 bytes).');
      }
      const digestHexNormalized = bytesToHex(digestBytes);

      const myOnChainDigest = myRole === 'p1' ? onChainTranscriptHex.p1 : onChainTranscriptHex.p2;
      if (myTranscriptCommitted) {
        if (myOnChainDigest && myOnChainDigest !== digestHexNormalized) {
          throw new Error(
            'You already committed a different transcript digest for this session. Settlement cannot complete; start a new match.'
          );
        }
      } else {
        try {
          await service.commitTranscript(sessionId, address, digestBytes, signer);
          setTranscriptCommits((prev) => ({ ...prev, [myRole]: true }));
          setOnChainTranscriptHex((prev) => ({ ...prev, [myRole]: digestHexNormalized }));
        } catch (err) {
          // Retry-safe behavior: if this wallet already committed earlier, continue settlement.
          if (!isAlreadyCommittedTranscriptError(err) && !isSwitchDecodeError(err)) {
            throw err;
          }

          let latestMine = '';
          try {
            const latest = await service.getSession(sessionId, address);
            if (!latest) throw err;

            const p1DigestHex = digestHexFromValue((latest as any).player1_transcript_digest);
            const p2DigestHex = digestHexFromValue((latest as any).player2_transcript_digest);
            setTranscriptCommits({ p1: !!p1DigestHex, p2: !!p2DigestHex });
            setOnChainTranscriptHex({ p1: p1DigestHex, p2: p2DigestHex });
            latestMine = myRole === 'p1' ? p1DigestHex : p2DigestHex;
          } catch (refreshErr) {
            if (!isSwitchDecodeError(refreshErr)) throw err;
            throw new Error('Could not verify transcript commit on-chain. Please click Finalize on-chain again.');
          }

          if (latestMine !== digestHexNormalized) throw err;
        }
      }

      // Ensure the committed digest is visible on-chain before notifying relayer.
      // This avoids a race where the tx was submitted but not yet reflected when end_game runs.
      setSettleMessage('Finalize submitted. Verifying transcript commit on-chain...');
      let confirmedDigest = '';
      const visibilityDeadline = Date.now() + 30_000;
      while (Date.now() < visibilityDeadline) {
        try {
          const latest = await service.getSession(sessionId, address);
          if (latest) {
            const p1DigestHex = digestHexFromValue((latest as any).player1_transcript_digest);
            const p2DigestHex = digestHexFromValue((latest as any).player2_transcript_digest);
            setTranscriptCommits({ p1: !!p1DigestHex, p2: !!p2DigestHex });
            setOnChainTranscriptHex({ p1: p1DigestHex, p2: p2DigestHex });
            confirmedDigest = myRole === 'p1' ? p1DigestHex : p2DigestHex;
            if (confirmedDigest === digestHexNormalized) break;
          }
        } catch (refreshErr) {
          if (!isSwitchDecodeError(refreshErr)) {
            console.warn('Transcript visibility check failed:', refreshErr);
          }
        }
        await sleep(1200);
      }
      const visibilityConfirmed = confirmedDigest === digestHexNormalized;
      if (!visibilityConfirmed) {
        // Soroban RPC can lag briefly after tx success; continue and let relayer retry submission.
        setSettleMessage('Finalize submitted. Commit visibility is delayed on RPC; continuing and waiting for relayer...');
      }

      const markRes = await relay.markTranscriptCommitted({
        role: myRole,
        transcriptDigestHex: digestHexNormalized,
      });
      if (!markRes.ok) {
        throw new Error(markRes.error ?? 'Failed to notify relay about transcript commit.');
      }

      const saltBytes = hexToBytes(saltHex);
      if (saltBytes.length !== 32) {
        throw new Error('Missing board salt. Re-commit your board on-chain to regenerate it.');
      }

      const bitsHex = bytesToHex(encodeBoardBits(myBoard));
      const revealRes = await relay.revealForSettlement({
        role: myRole,
        saltHex,
        boardBitsHex: bitsHex,
      });
      if (!revealRes.ok) {
        throw new Error(revealRes.error ?? 'Failed to reveal board secret to relayer.');
      }

      setFinalizeSubmitted(true);
      setSettleMessage('Finalize submitted. Waiting for relayer status...');
    } catch (err: any) {
      console.error(err);
      setSettleMessage(err?.message ? `Finalize failed: ${err.message}` : 'Finalize failed.');
    } finally {
      setFinalizing(false);
    }
  };

  const settleSealBytesLen = useMemo(() => {
    try {
      return hexToBytes(settleSealHex).length;
    } catch {
      return -1;
    }
  }, [settleSealHex]);

  const settleJournalBytesLen = useMemo(() => {
    try {
      return hexToBytes(settleJournalHex).length;
    } catch {
      return -1;
    }
  }, [settleJournalHex]);

  return (
    <div className="min-h-screen bg-medieval-bg bg-medieval-paper">
      <AnimatePresence>
        {showPresenceModal && !showOutcomeModal && !gameFinishedLocal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: reduceMotion ? 0.01 : 0.14, ease: 'easeIn' } }}
            transition={{ duration: reduceMotion ? 0.01 : 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={closePresenceModal}
          >
            <motion.div
              initial={{ scale: reduceMotion ? 1 : 0.92, opacity: 0, y: reduceMotion ? 0 : 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{
                scale: reduceMotion ? 1 : 0.92,
                opacity: 0,
                y: reduceMotion ? 0 : 12,
                transition: { duration: reduceMotion ? 0.01 : 0.14, ease: 'easeIn' },
              }}
              transition={{ duration: reduceMotion ? 0.01 : 0.22, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={presenceModalMode === 'joined' ? 'Opponent joined' : 'Waiting for opponent'}
              className="w-full max-w-lg"
            >
              <MedievalPanel className="p-7 relative">
                <button
                  onClick={closePresenceModal}
                  className="absolute top-4 right-4 text-medieval-text-secondary hover:text-medieval-gold transition-colors"
                  aria-label="Close"
                >
                  <X className="w-6 h-6" />
                </button>

                <div className="text-center space-y-3">
                  <div
                    className={[
                      'flex items-center justify-center gap-3 font-medieval text-2xl tracking-widest',
                      presenceModalMode === 'joined' ? 'text-medieval-gold' : 'text-medieval-text',
                    ].join(' ')}
                  >
                    {presenceModalMode === 'joined' ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
                    {presenceModalMode === 'joined' ? 'OPPONENT JOINED' : 'WAITING FOR OPPONENT'}
                  </div>
                  <div className="text-xs font-medieval text-medieval-text-secondary">
                    {presenceModalMode === 'joined'
                      ? 'Both players are in the relay room. You can place ships, commit board, and start turns.'
                      : 'Share your invite and keep this match open. This will auto-update when your opponent connects.'}
                  </div>
                  <div className="h-px w-56 mx-auto bg-gradient-to-r from-transparent via-medieval-gold/50 to-transparent" />
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 font-medieval text-sm text-medieval-text">
                  <div className="p-3 rounded bg-white/20 border border-medieval-border/30">
                    <div className="text-xs tracking-widest uppercase text-medieval-text-secondary">Session</div>
                    <div className="mt-1">{activeMatch?.sessionId ?? '-'}</div>
                  </div>
                  <div className="p-3 rounded bg-white/20 border border-medieval-border/30">
                    <div className="text-xs tracking-widest uppercase text-medieval-text-secondary">Relay</div>
                    <div className="mt-1">{relay.connected ? 'Connected' : 'Disconnected'}</div>
                  </div>
                  <div className="p-3 rounded bg-white/20 border border-medieval-border/30 sm:col-span-2">
                    <div className="text-xs tracking-widest uppercase text-medieval-text-secondary">Opponent</div>
                    <div className="mt-1 break-all">
                      {relayPeerLabel ?? (presenceModalMode === 'joined' ? 'Connected' : 'Not connected yet')}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  <MedievalButton
                    variant={presenceModalMode === 'joined' ? 'gold' : 'secondary'}
                    size="sm"
                    onClick={closePresenceModal}
                  >
                    CONTINUE
                  </MedievalButton>
                  <MedievalButton
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      closePresenceModal();
                      clearActiveMatch();
                      setScene('lobby');
                    }}
                  >
                    BACK TO LOBBY
                  </MedievalButton>
                  {presenceModalMode === 'joined' && (
                    <div className="text-xs font-medieval text-medieval-text-secondary self-center">
                      Ready when you are.
                    </div>
                  )}
                </div>
              </MedievalPanel>
            </motion.div>
          </motion.div>
        )}

        {outcome && showOutcomeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: reduceMotion ? 0.01 : 0.14, ease: 'easeIn' } }}
            transition={{ duration: reduceMotion ? 0.01 : 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowOutcomeModal(false)}
          >
            <motion.div
              initial={{ scale: reduceMotion ? 1 : 0.92, opacity: 0, y: reduceMotion ? 0 : 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{
                scale: reduceMotion ? 1 : 0.92,
                opacity: 0,
                y: reduceMotion ? 0 : 12,
                transition: { duration: reduceMotion ? 0.01 : 0.14, ease: 'easeIn' },
              }}
              transition={{ duration: reduceMotion ? 0.01 : 0.22, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={outcome === 'victory' ? 'Victory summary' : 'Defeat summary'}
              className="w-full max-w-xl"
            >
              <MedievalPanel className="p-8 relative">
                <button
                  onClick={() => setShowOutcomeModal(false)}
                  className="absolute top-4 right-4 text-medieval-text-secondary hover:text-medieval-gold transition-colors"
                  aria-label="Close"
                >
                  <X className="w-6 h-6" />
                </button>

                <div className="text-center space-y-3">
                  <div
                    className={[
                      'flex items-center justify-center gap-3 font-medieval text-3xl tracking-widest',
                      outcome === 'victory' ? 'text-medieval-gold' : 'text-red-900',
                    ].join(' ')}
                  >
                    {outcome === 'victory' ? <Trophy className="w-7 h-7" /> : <Skull className="w-7 h-7" />}
                    {outcome === 'victory' ? 'VICTORY' : 'DEFEAT'}
                  </div>
                  <div className="text-xs font-medieval text-medieval-text-secondary">
                    Local game finished. Each player clicks “Finalize on-chain” once. The relayer then proves + submits `end_game()`.
                  </div>
                  <div className="h-px w-56 mx-auto bg-gradient-to-r from-transparent via-medieval-gold/50 to-transparent" />
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 font-medieval text-sm text-medieval-text">
                  <div className="p-3 rounded bg-white/20 border border-medieval-border/30">
                    <div className="text-xs tracking-widest uppercase text-medieval-text-secondary">Turns</div>
                    <div className="mt-1">{turn}</div>
                  </div>
                  <div className="p-3 rounded bg-white/20 border border-medieval-border/30">
                    <div className="text-xs tracking-widest uppercase text-medieval-text-secondary">Mode</div>
                    <div className="mt-1">{modeId === MODE_CLASSIC ? 'Classic' : 'Salvo'}</div>
                  </div>
                  <div className="p-3 rounded bg-white/20 border border-medieval-border/30">
                    <div className="text-xs tracking-widest uppercase text-medieval-text-secondary">Your Hits</div>
                    <div className="mt-1">
                      {myHitsOnEnemy}/{SHIP_CELLS}
                    </div>
                  </div>
                  <div className="p-3 rounded bg-white/20 border border-medieval-border/30">
                    <div className="text-xs tracking-widest uppercase text-medieval-text-secondary">Hits Taken</div>
                    <div className="mt-1">
                      {myHitsTaken}/{SHIP_CELLS}
                    </div>
                  </div>
                </div>

                <div className="mt-3 p-3 rounded bg-white/20 border border-medieval-border/30 font-medieval text-sm text-medieval-text">
                  <div className="text-xs tracking-widest uppercase text-medieval-text-secondary">
                    H2H {h2hMode === 'pvc' ? 'PvC' : 'PvP'} vs {h2hOpponentLabel}
                  </div>
                  <div className="mt-1">
                    {h2hStats?.wins ?? 0}W / {h2hStats?.losses ?? 0}L
                    {h2hStats?.draws ? ` / ${h2hStats.draws}D` : ''}
                  </div>
                </div>

                <div className="mt-4 text-xs font-medieval text-medieval-text-secondary space-y-1">
                  <div>
                    Commitments: P1 {commitments.p1 ? '✓' : '…'} / P2 {commitments.p2 ? '✓' : '…'}
                  </div>
                  <div>
                    Transcript: P1 {transcriptCommits.p1 ? '✓' : '…'} / P2 {transcriptCommits.p2 ? '✓' : '…'}
                    {transcriptCommittedByBoth ? (transcriptMatchesOnChain ? ' (match)' : ' (mismatch)') : ''}
                  </div>
                </div>

                {transcriptCommittedByBoth && !transcriptMatchesOnChain && (
                  <div className="mt-3 text-xs font-medieval text-red-900/80">
                    Warning: transcript digests do not match. Settlement will fail until both players commit the same digest.
                  </div>
                )}

                <div className="mt-3 text-xs font-medieval text-medieval-text-secondary space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={[
                        'inline-flex items-center gap-2 rounded border px-2 py-1',
                        relayerIsDone
                          ? 'text-green-900 border-green-900/30 bg-green-500/10'
                          : relayerIsError
                            ? 'text-red-900 border-red-900/30 bg-red-500/10'
                            : relayerIsBusy
                              ? 'text-medieval-gold border-medieval-gold/30 bg-medieval-gold/10'
                              : 'text-medieval-text-secondary border-medieval-border/30 bg-white/10',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'h-2 w-2 rounded-full',
                          relayerIsDone
                            ? 'bg-green-700'
                            : relayerIsError
                              ? 'bg-red-700'
                              : relayerIsBusy
                                ? 'bg-medieval-gold'
                                : 'bg-medieval-text-secondary/70',
                        ].join(' ')}
                      />
                      Relayer: {relayerPhaseLabel}
                    </span>
                    {settleStatus?.txHash && <span className="break-all">Tx: {settleStatus.txHash}</span>}
                  </div>
                  {settleStatus?.error && (
                    <div className="text-red-900/80">Relayer error: {settleStatus.error}</div>
                  )}
                  {settleMessage && <div>{settleMessage}</div>}
                </div>
                {rematchMessage && (
                  <div className="mt-2 text-xs font-medieval text-medieval-text-secondary">
                    {rematchMessage}
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-2">
                  <MedievalButton
                    variant={outcome === 'victory' ? 'gold' : 'danger'}
                    size="sm"
                    disabled={!canFinalizeOnChain}
                    onClick={finalizeOnChain}
                  >
                    {finalizeCtaLabel}
                  </MedievalButton>
                  {renderRematchControls('modal')}
                  <MedievalButton
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      clearActiveMatch();
                      setScene('lobby');
                    }}
                  >
                    BACK TO LOBBY
                  </MedievalButton>
                  <MedievalButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowOutcomeModal(false)}
                  >
                    CONTINUE
                  </MedievalButton>
                </div>
              </MedievalPanel>
            </motion.div>
          </motion.div>
        )}

        {showRematchRequestModal && hasIncomingRematchOffer && pendingRematchOffer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: reduceMotion ? 0.01 : 0.14, ease: 'easeIn' } }}
            transition={{ duration: reduceMotion ? 0.01 : 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowRematchRequestModal(false)}
          >
            <motion.div
              initial={{ scale: reduceMotion ? 1 : 0.94, opacity: 0, y: reduceMotion ? 0 : 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{
                scale: reduceMotion ? 1 : 0.94,
                opacity: 0,
                y: reduceMotion ? 0 : 10,
                transition: { duration: reduceMotion ? 0.01 : 0.14, ease: 'easeIn' },
              }}
              transition={{ duration: reduceMotion ? 0.01 : 0.22, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Rematch request"
              className="w-full max-w-lg"
            >
              <MedievalPanel className="p-6 relative">
                <button
                  onClick={() => setShowRematchRequestModal(false)}
                  className="absolute top-4 right-4 text-medieval-text-secondary hover:text-medieval-gold transition-colors"
                  aria-label="Close rematch request"
                >
                  <X className="w-6 h-6" />
                </button>

                <div className="space-y-3">
                  <div className="font-medieval text-medieval-gold tracking-widest text-lg uppercase">
                    Rematch Request
                  </div>
                  <div className="text-xs font-medieval text-medieval-text-secondary">
                    {pendingRematchOffer.from} wants to run another match.
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-medieval text-sm text-medieval-text">
                    <div className="p-3 rounded bg-white/20 border border-medieval-border/30">
                      <div className="text-xs tracking-widest uppercase text-medieval-text-secondary">Next Session</div>
                      <div className="mt-1">{pendingRematchOffer.newSessionId}</div>
                    </div>
                    <div className="p-3 rounded bg-white/20 border border-medieval-border/30">
                      <div className="text-xs tracking-widest uppercase text-medieval-text-secondary">Mode</div>
                      <div className="mt-1">{pendingRematchOffer.modeId === MODE_SALVO ? 'Salvo' : 'Classic'}</div>
                    </div>
                  </div>
                  {rematchMessage && (
                    <div className="text-xs font-medieval text-medieval-text-secondary">
                      {rematchMessage}
                    </div>
                  )}
                  <div className="pt-2 flex flex-wrap gap-2">
                    <MedievalButton
                      variant="gold"
                      size="sm"
                      disabled={!canAcceptIncomingRematch}
                      onClick={() => {
                        if (!connected || !address) {
                          setRematchMessage('Connect your wallet first to accept this rematch.');
                          return;
                        }
                        if (!signer) {
                          setRematchMessage('Wallet signer is not ready. Reconnect wallet and try again.');
                          return;
                        }
                        if (!supportsSignAuthEntry) {
                          setRematchMessage('This wallet cannot accept rematch invites (missing signAuthEntry support). Use Freighter for rematch.');
                          return;
                        }
                        void acceptPvPRematch();
                      }}
                    >
                      {rematchAction === 'accepting' || rematchAction === 'starting'
                        ? 'ACCEPTING...'
                        : 'ACCEPT REMATCH'}
                    </MedievalButton>
                    <MedievalButton
                      variant="secondary"
                      size="sm"
                      disabled={rematchBusy}
                      onClick={declinePvPRematch}
                    >
                      DECLINE
                    </MedievalButton>
                  </div>
                </div>
              </MedievalPanel>
            </motion.div>
          </motion.div>
        )}

        {showCommitWaitModal && !showOutcomeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: reduceMotion ? 0.01 : 0.14, ease: 'easeIn' } }}
            transition={{ duration: reduceMotion ? 0.01 : 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowCommitWaitModal(false)}
          >
            <motion.div
              initial={{ scale: reduceMotion ? 1 : 0.96, opacity: 0, y: reduceMotion ? 0 : 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{
                scale: reduceMotion ? 1 : 0.96,
                opacity: 0,
                y: reduceMotion ? 0 : 8,
                transition: { duration: reduceMotion ? 0.01 : 0.14, ease: 'easeIn' },
              }}
              transition={{ duration: reduceMotion ? 0.01 : 0.2, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Enemy board locked"
              className="w-full max-w-md"
            >
              <MedievalPanel className="p-5">
                <div className="text-center space-y-2">
                  <div className="font-medieval text-medieval-gold tracking-widest text-sm">ENEMY BOARD LOCKED</div>
                  <div className="text-xs font-medieval text-medieval-text-secondary">{commitWaitMessage}</div>
                </div>
              </MedievalPanel>
            </motion.div>
          </motion.div>
        )}

        {showBoardCommittedModal && !showOutcomeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: reduceMotion ? 0.01 : 0.14, ease: 'easeIn' } }}
            transition={{ duration: reduceMotion ? 0.01 : 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowBoardCommittedModal(false)}
          >
            <motion.div
              initial={{ scale: reduceMotion ? 1 : 0.96, opacity: 0, y: reduceMotion ? 0 : 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{
                scale: reduceMotion ? 1 : 0.96,
                opacity: 0,
                y: reduceMotion ? 0 : 8,
                transition: { duration: reduceMotion ? 0.01 : 0.14, ease: 'easeIn' },
              }}
              transition={{ duration: reduceMotion ? 0.01 : 0.2, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Board committed"
              className="w-full max-w-md"
            >
              <MedievalPanel className="p-5">
                <div className="text-center space-y-2">
                  <div className="font-medieval text-medieval-gold tracking-widest text-sm">BOARD COMMITTED</div>
                  <div className="text-xs font-medieval text-medieval-text-secondary">
                    Board committed on-chain. Good luck, captain.
                  </div>
                </div>
              </MedievalPanel>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <MedievalButton
            variant="secondary"
            size="sm"
            onClick={() => {
              clearActiveMatch();
              setScene('lobby');
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            BACK TO LOBBY
          </MedievalButton>

          <div className="flex items-center gap-2">
            {isBotMatch && (
              <span className="inline-flex items-center rounded border border-medieval-gold/40 bg-medieval-gold/10 px-2 py-1 font-medieval text-[10px] tracking-widest uppercase text-medieval-gold">
                COMPUTER
              </span>
            )}
            <div className="font-medieval text-medieval-text-secondary text-xs tracking-widest uppercase text-right">
              {connected && address ? `You: ${address}` : 'Wallet not connected'}
            </div>
          </div>
        </div>

        <MedievalPanel title="MATCH STATUS">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 font-medieval text-sm text-medieval-text">
            <div className="space-y-1">
              <div className="text-medieval-text-secondary text-xs tracking-widest uppercase">Session</div>
              <div>{activeMatch ? activeMatch.sessionId : 'None'}</div>
            </div>
            <div className="space-y-1">
              <div className="text-medieval-text-secondary text-xs tracking-widest uppercase">Mode</div>
              <div>{modeId === MODE_CLASSIC ? 'Classic (1 shot)' : 'Salvo (2 shots)'}</div>
            </div>
            <div className="space-y-1">
              <div className="text-medieval-text-secondary text-xs tracking-widest uppercase">State</div>
              <div>{statusText}</div>
              <div className="text-xs text-medieval-text-secondary">
                Turn {turn} {pendingTurn !== null ? `(pending ${pendingTurn})` : ''}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-medieval-text-secondary text-xs tracking-widest uppercase">
                H2H {h2hMode === 'pvc' ? 'PvC' : 'PvP'}
              </div>
              <div>
                {h2hStats?.wins ?? 0}W · {h2hStats?.losses ?? 0}L
                {h2hStats?.draws ? ` · ${h2hStats.draws}D` : ''}
              </div>
              <div className="text-xs text-medieval-text-secondary break-all">vs {h2hOpponentLabel}</div>
            </div>
          </div>

          <div className="mt-4 text-xs font-medieval text-medieval-text-secondary">
            On-chain session: {sessionExists === null ? 'Unknown' : sessionExists ? 'Found' : 'Not found (waiting for start_game)'}
            {' · '}
            Commitments: P1 {commitments.p1 ? '✓' : '…'} / P2 {commitments.p2 ? '✓' : '…'}
            {' · '}
            Transcript: P1 {transcriptCommits.p1 ? '✓' : '…'} / P2 {transcriptCommits.p2 ? '✓' : '…'}
          </div>

          {gameFinishedLocal && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {renderRematchControls('panel')}
              {rematchMessage && (
                <div className="text-xs font-medieval text-medieval-text-secondary">
                  {rematchMessage}
                </div>
              )}
            </div>
          )}
        </MedievalPanel>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MedievalPanel title="YOUR BOARD (SECRET)">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <MedievalButton
                  variant="secondary"
                  size="sm"
                  disabled={!canEditBoard}
                  onClick={() => {
                    setMyBoard(makeBoolGrid(GRID_SIZE, false));
                    setSaltHex('');
                    setCommitmentHex('');
                  }}
                >
                  CLEAR
                </MedievalButton>
                <MedievalButton
                  variant="gold"
                  size="sm"
                  disabled={!canEditBoard}
                  onClick={() => {
                    setMyBoard(randomizeBoard(GRID_SIZE, SHIP_CELLS));
                    setSaltHex('');
                    setCommitmentHex('');
                  }}
                >
                  RANDOMIZE
                </MedievalButton>
                <div className="ml-auto text-xs font-medieval text-medieval-text-secondary">
                  Ships placed: {shipsPlaced}/{SHIP_CELLS}
                </div>
              </div>

              <div className="relative">
                <div
                  className={[
                    'grid gap-1 transition-opacity duration-200 ease-out',
                    myBoardLocked ? 'opacity-45 saturate-50 pointer-events-none' : '',
                  ].join(' ')}
                  style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
                >
                  {myBoard.map((row, y) =>
                    row.map((cell, x) => {
                      const shot = incoming[y][x];
                      const isHit = shot === 2;
                      const isMiss = shot === 1;
                      const isRecentImpact = recentIncomingImpacts.has(impactKey(x, y));
                      const bg = isHit
                        ? 'bg-red-700/60'
                        : isMiss
                          ? 'bg-slate-500/40'
                          : cell
                            ? 'bg-medieval-gold/70'
                            : 'bg-white/20';
                      const ring = cell ? 'ring-1 ring-medieval-gold/40' : 'ring-1 ring-medieval-border/20';
                      const impactRing =
                        isRecentImpact && isHit
                          ? 'ring-2 ring-red-500/70'
                          : isRecentImpact && isMiss
                            ? 'ring-2 ring-slate-400/70'
                            : '';

                      return (
                        <motion.button
                          key={`${x}-${y}`}
                          className={`relative overflow-hidden aspect-square rounded ${bg} ${ring} ${impactRing} hover:brightness-110 transition-all duration-200 ease-out`}
                          disabled={!canEditBoard}
                          whileTap={canEditBoard && !reduceMotion ? { scale: 0.98 } : undefined}
                          animate={
                            isRecentImpact
                              ? { scale: [1, isHit ? 1.06 : 1.03, 1] }
                              : { scale: 1 }
                          }
                          transition={{ duration: reduceMotion ? 0.01 : isRecentImpact ? 0.22 : 0.18, ease: 'easeOut' }}
                          onClick={() => {
                            setMyBoard((prev) => {
                              const next = prev.map((r) => r.slice());
                              const hasShip = !!next[y][x];
                              if (hasShip) {
                                next[y][x] = false;
                                return next;
                              }
                              if (countTrue(prev) >= SHIP_CELLS) return prev;
                              next[y][x] = true;
                              return next;
                            });
                            setSaltHex('');
                            setCommitmentHex('');
                          }}
                          title={cell ? 'Ship' : 'Water'}
                        >
                          {!cell && !isHit && !isMiss && (
                            <span className="pointer-events-none absolute inset-0 board-water-sheen opacity-0 hover:opacity-100 transition-opacity duration-200" />
                          )}
                          {cell && !isHit && !isMiss && (
                            <span className="pointer-events-none absolute inset-1 rounded board-ship-glint" />
                          )}
                          {isMiss && (
                            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-100/80" />
                              <span className={`absolute h-4 w-4 rounded-full border border-slate-100/70 ${isRecentImpact ? 'board-miss-ring' : ''}`} />
                            </span>
                          )}
                          {isHit && (
                            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                              <span className="h-2.5 w-2.5 rounded-full bg-red-100/90 shadow-[0_0_8px_rgba(254,226,226,0.8)]" />
                              <span className={`absolute h-5 w-5 rounded-full border border-red-100/70 ${isRecentImpact ? 'board-hit-ring' : ''}`} />
                            </span>
                          )}
                        </motion.button>
                      );
                    })
                  )}
                </div>

                {myBoardLocked && (
                  <div className="absolute inset-0 rounded bg-black/10 border border-medieval-border/20 flex items-center justify-center p-4">
                    <span className="text-xs font-medieval tracking-widest text-medieval-text-secondary uppercase text-center">
                      Board Locked After Commit
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <MedievalButton
                  variant={myBoardCommitted ? 'secondary' : 'primary'}
                  fullWidth
                  disabled={!canCommit}
                  className={myBoardCommitted ? 'opacity-55 grayscale cursor-not-allowed' : ''}
                  onClick={async () => {
                    if (!address) return;
                    if (shipsPlaced !== SHIP_CELLS) return;
                    if (committing) return;
                    setCommitting(true);
                    try {
                      const c = await sha256CommitBoard(myBoard);
                      setSaltHex(c.saltHex);
                      setCommitmentHex(c.commitmentHex);
                      await service.commitBoard(sessionId, address, c.commitmentBytes, signer);
                      setSessionExists(true);
                      setCommitments((prev) =>
                        myRole === 'p1' ? { ...prev, p1: true } : myRole === 'p2' ? { ...prev, p2: true } : prev
                      );
                      flashBoardCommittedModal();
                    } catch (err: any) {
                      console.error(err);
                    } finally {
                      setCommitting(false);
                    }
                  }}
                >
                  <Shield className="w-4 h-4" />
                  {committing ? 'COMMITTING...' : myBoardCommitted ? 'BOARD COMMITTED' : 'COMMIT BOARD ON-CHAIN'}
                </MedievalButton>
              </div>

              {(saltHex || commitmentHex) && (
                <div className="space-y-2">
                  <div className="text-xs font-medieval text-medieval-text-secondary">
                    Board committed on-chain. Your salt/commitment are hidden by default.
                  </div>
                  {showAdvanced && (
                    <>
                      <div className="text-xs font-medieval text-medieval-text-secondary uppercase tracking-widest">
                        Commitment (sha256)
                      </div>
                      <div className="text-xs font-mono break-all bg-white/20 border border-medieval-border/30 rounded p-2">
                        {commitmentHex || '...'}
                      </div>
                      <div className="flex gap-2">
                        <MedievalButton
                          variant="secondary"
                          size="sm"
                          onClick={() => copy(commitmentHex, 'commitment')}
                          disabled={!commitmentHex}
                        >
                          <Copy className="w-4 h-4" />
                          {copiedKey === 'commitment' ? 'COPIED' : 'COPY COMMIT'}
                        </MedievalButton>
                        <MedievalButton
                          variant="secondary"
                          size="sm"
                          onClick={() => copy(saltHex, 'salt')}
                          disabled={!saltHex}
                        >
                          <Copy className="w-4 h-4" />
                          {copiedKey === 'salt' ? 'COPIED' : 'COPY SALT'}
                        </MedievalButton>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </MedievalPanel>

          <MedievalPanel title="ENEMY WATERS">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-xs font-medieval text-medieval-text-secondary">
                  Select {shotsPerTurn} target{shotsPerTurn === 1 ? '' : 's'} per turn.
                </div>
                {waitingForOpponentFire && (
                  <div
                    className={[
                      'inline-flex items-center gap-1 rounded border border-medieval-border/30 bg-black/10 px-2 py-1 text-[11px] font-medieval tracking-widest text-medieval-text-secondary uppercase',
                      reduceMotion ? '' : 'animate-pulse',
                    ].join(' ')}
                  >
                    <Clock3 className="w-3 h-3" />
                    Opponent firing
                  </div>
                )}
                <div className="ml-auto text-xs font-medieval text-medieval-text-secondary">
                  Hits: {myHitsOnEnemy}/{SHIP_CELLS}
                </div>
              </div>

              <div className="relative">
                <div
                  className={[
                    'grid gap-1 transition-opacity duration-200 ease-out',
                    enemyBoardLocked ? 'opacity-45 saturate-50 pointer-events-none' : '',
                    waitingForOpponentFire ? 'opacity-65 saturate-75' : '',
                  ].join(' ')}
                  style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
                >
                  {enemyBoard.map((row, y) =>
                    row.map((cell, x) => {
                      const selectedNow = selected.some((s) => s.x === x && s.y === y);
                      const selectedOrder = selectedNow
                        ? selected.findIndex((s) => s.x === x && s.y === y) + 1
                        : 0;
                      const isRecentImpact = recentEnemyImpacts.has(impactKey(x, y));
                      const bg = cell === 2 ? 'bg-red-700/60' : cell === 1 ? 'bg-slate-500/40' : 'bg-white/20';
                      const ring = selectedNow
                        ? canFire
                          ? 'ring-2 ring-red-500/80'
                          : 'ring-2 ring-medieval-gold'
                        : 'ring-1 ring-medieval-border/20';
                      const impactRing =
                        isRecentImpact && cell === 2
                          ? 'ring-2 ring-red-500/70'
                          : isRecentImpact && cell === 1
                            ? 'ring-2 ring-slate-400/70'
                            : '';
                      const disabled = cell !== 0 || !canSelectTargets;

                      return (
                        <motion.button
                          key={`${x}-${y}`}
                          className={`relative overflow-hidden aspect-square rounded ${bg} ${ring} ${impactRing} hover:brightness-110 transition-all duration-200 ease-out`}
                          disabled={disabled}
                          whileTap={!disabled && !reduceMotion ? { scale: 0.98 } : undefined}
                          animate={
                            isRecentImpact
                              ? { scale: [1, cell === 2 ? 1.06 : 1.03, 1] }
                              : { scale: 1 }
                          }
                          transition={{ duration: reduceMotion ? 0.01 : isRecentImpact ? 0.22 : 0.18, ease: 'easeOut' }}
                          onClick={() => {
                            setSelected((prev) => {
                              const exists = prev.find((s) => s.x === x && s.y === y);
                              if (exists) return prev.filter((s) => !(s.x === x && s.y === y));
                              if (prev.length >= shotsPerTurn) return prev;
                              return prev.concat([{ x, y }]);
                            });
                          }}
                        >
                          {cell === 0 && !selectedNow && (
                            <span className="pointer-events-none absolute inset-0 board-water-sheen opacity-0 hover:opacity-100 transition-opacity duration-200" />
                          )}
                          {selectedNow && (
                            <span
                              className={[
                                'pointer-events-none absolute inset-[6px] board-target-reticle',
                                canFire ? 'board-target-reticle--armed' : '',
                              ].join(' ')}
                            >
                              <span className="board-target-reticle__ring board-target-reticle__ring--outer" />
                              <span className="board-target-reticle__ring board-target-reticle__ring--inner" />
                              <span className="board-target-reticle__cross board-target-reticle__cross--h" />
                              <span className="board-target-reticle__cross board-target-reticle__cross--v" />
                              <span className="board-target-reticle__dot" />
                              {shotsPerTurn > 1 && selectedOrder > 0 && (
                                <span className="board-target-reticle__index">{selectedOrder}</span>
                              )}
                            </span>
                          )}
                          {cell === 1 && (
                            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-100/80" />
                              <span className={`absolute h-4 w-4 rounded-full border border-slate-100/70 ${isRecentImpact ? 'board-miss-ring' : ''}`} />
                            </span>
                          )}
                          {cell === 2 && (
                            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                              <span className="h-2.5 w-2.5 rounded-full bg-red-100/90 shadow-[0_0_8px_rgba(254,226,226,0.8)]" />
                              <span className={`absolute h-5 w-5 rounded-full border border-red-100/70 ${isRecentImpact ? 'board-hit-ring' : ''}`} />
                            </span>
                          )}
                        </motion.button>
                      );
                    })
                  )}
                </div>

                {enemyBoardLocked && (
                  <button
                    type="button"
                    className="absolute inset-0 rounded bg-black/10 border border-medieval-border/20 flex items-center justify-center p-4 transition-transform duration-200 ease-out active:scale-[0.98]"
                    onClick={() =>
                      flashCommitWaitModal(
                        myBoardCommitted
                          ? 'Waiting for opponent to commit board.'
                          : 'Commit your board on-chain first, then wait for your opponent to commit.'
                      )
                    }
                  >
                    <span className="text-xs font-medieval tracking-widest text-medieval-text-secondary uppercase text-center">
                      Locked Until Both Boards Are Committed
                    </span>
                  </button>
                )}

                {waitingForOpponentFire && !enemyBoardLocked && (
                  <div className="absolute inset-0 rounded bg-black/10 border border-medieval-border/20 flex items-center justify-center p-4 pointer-events-none">
                    <span className="text-xs font-medieval tracking-widest text-medieval-text-secondary uppercase text-center">
                      Opponent Turn To Fire
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <MedievalButton
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelected([])}
                  disabled={selected.length === 0}
                >
                  CLEAR TARGETS
                </MedievalButton>
                <MedievalButton
                  variant="primary"
                  fullWidth
                  disabled={!canFire}
                  className={waitingForOpponentFire ? 'opacity-55 grayscale cursor-not-allowed' : ''}
                  onClick={() => {
                    if (!address || !activeMatch) return;
                    const shots = selectedRef.current;
                    if (shots.length !== shotsPerTurn) return;
                    setFireFeedbackState('launching');
                    if (fireFeedbackTimeoutRef.current) clearTimeout(fireFeedbackTimeoutRef.current);
                    fireFeedbackTimeoutRef.current = setTimeout(() => {
                      setFireFeedbackState('awaiting');
                      fireFeedbackTimeoutRef.current = null;
                    }, 220);
                    relay.sendMove({
                      sessionId: activeMatch.sessionId,
                      from: address,
                      turn: turnRef.current,
                      shots,
                    });
                    setPendingTurn(turnRef.current);
                    setSelected([]);

                    setTranscriptJson((prev) => {
                      const entry = { turn: turnRef.current, attacker: address, shots, results: null };
                      try {
                        const arr = prev ? JSON.parse(prev) : [];
                        const next = Array.isArray(arr) ? arr : [];
                        const idx = next.findIndex((x: any) => x?.turn === entry.turn);
                        if (idx === -1) next.push(entry);
                        else next[idx] = { ...next[idx], ...entry };
                        next.sort((a: any, b: any) => (a.turn ?? 0) - (b.turn ?? 0));
                        return JSON.stringify(next);
                      } catch {
                        return JSON.stringify([entry]);
                      }
                    });
                  }}
                >
                  <Swords className="w-4 h-4" />
                  {waitingForOpponentFire ? 'WAITING FOR OPPONENT' : 'FIRE'}
                </MedievalButton>
              </div>
              <AnimatePresence initial={false} mode="wait">
                {fireFeedbackState !== 'idle' && (
                  <motion.div
                    key={fireFeedbackState}
                    initial={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
                    transition={{ duration: reduceMotion ? 0.01 : 0.16, ease: 'easeOut' }}
                    className="text-[11px] font-medieval text-medieval-text-secondary uppercase tracking-widest"
                  >
                    {fireFeedbackState === 'launching'
                      ? 'Launching volley...'
                      : fireFeedbackState === 'awaiting'
                        ? 'Volley sent. Awaiting enemy result...'
                        : 'Impact confirmed.'}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </MedievalPanel>
        </div>

        {showAdvanced && (
          <MedievalPanel title="TRANSCRIPT (ADVANCED)">
            <div className="space-y-3">
              <div className="text-xs font-medieval text-medieval-text-secondary">
                Debug-only: this transcript becomes the private input for the ZK settlement proof.
              </div>
              <textarea
                className="w-full h-40 px-3 py-2 bg-white/30 border border-medieval-border rounded font-mono text-xs"
                value={transcriptJson}
                readOnly
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-medieval text-medieval-text-secondary uppercase tracking-widest">
                    Transcript Bytes (hex)
                  </div>
                  <div className="text-xs font-mono break-all bg-white/20 border border-medieval-border/30 rounded p-2 min-h-[64px]">
                    {transcriptBytesHex || '(empty)'}
                  </div>
                  <MedievalButton
                    variant="secondary"
                    size="sm"
                    onClick={() => copy(transcriptBytesHex, 'bytes')}
                    disabled={!transcriptBytesHex}
                  >
                    <Copy className="w-4 h-4" />
                    {copiedKey === 'bytes' ? 'COPIED' : 'COPY BYTES'}
                  </MedievalButton>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medieval text-medieval-text-secondary uppercase tracking-widest">
                    Local Digest (sha256)
                  </div>
                  <div className="text-xs font-mono break-all bg-white/20 border border-medieval-border/30 rounded p-2 min-h-[64px]">
                    {transcriptDigestHex || '(empty)'}
                  </div>
                  <MedievalButton
                    variant="secondary"
                    size="sm"
                    onClick={() => copy(transcriptDigestHex, 'digest')}
                    disabled={!transcriptDigestHex}
                  >
                    <Copy className="w-4 h-4" />
                    {copiedKey === 'digest' ? 'COPIED' : 'COPY DIGEST'}
                  </MedievalButton>
                </div>
              </div>
              <div className="flex gap-2">
                <MedievalButton
                  variant="secondary"
                  size="sm"
                  onClick={() => copy(transcriptJson, 'transcript')}
                  disabled={!transcriptJson}
                >
                  <Copy className="w-4 h-4" />
                  {copiedKey === 'transcript' ? 'COPIED' : 'COPY TRANSCRIPT'}
                </MedievalButton>
                <MedievalButton
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setEnemyBoard(makeCellGrid(GRID_SIZE, 0));
                    setIncoming(makeCellGrid(GRID_SIZE, 0));
                    setTurn(0);
                    setPendingTurn(null);
                    setSelected([]);
                    setTranscriptJson('');
                    setTranscriptBytesHex('');
                    setTranscriptDigestHex('');
                  }}
                >
                  RESET LOCAL STATE
                </MedievalButton>
              </div>
            </div>
          </MedievalPanel>
        )}

        <div ref={settlePanelRef}>
          <MedievalPanel title="FINALIZE ON-CHAIN">
            <div className="space-y-3">
              <div className="text-xs font-medieval text-medieval-text-secondary">
                Each player clicks “Finalize on-chain” once. You sign a single transaction to commit the transcript digest; then the relayer generates the proof and submits `end_game()`.
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 font-medieval text-sm text-medieval-text">
                <div className="p-3 rounded bg-white/20 border border-medieval-border/30">
                  <div className="text-xs tracking-widest uppercase text-medieval-text-secondary">Transcript Commit</div>
                  <div className="mt-1">
                    P1 {transcriptCommits.p1 ? '✓' : '…'} / P2 {transcriptCommits.p2 ? '✓' : '…'}
                  </div>
                </div>
                <div className="p-3 rounded bg-white/20 border border-medieval-border/30">
                  <div className="text-xs tracking-widest uppercase text-medieval-text-secondary">Board Reveal (relayer)</div>
                  <div className="mt-1">
                    P1 {settleStatus?.p1?.revealed ? '✓' : '…'} / P2 {settleStatus?.p2?.revealed ? '✓' : '…'}
                  </div>
                </div>
                <div className="p-3 rounded bg-white/20 border border-medieval-border/30">
                  <div className="text-xs tracking-widest uppercase text-medieval-text-secondary">Relayer</div>
                  <div
                    className={[
                      'mt-1 inline-flex items-center gap-2 rounded border px-2 py-1',
                      relayerIsDone
                        ? 'text-green-900 border-green-900/30 bg-green-500/10'
                        : relayerIsError
                          ? 'text-red-900 border-red-900/30 bg-red-500/10'
                          : relayerIsBusy
                            ? 'text-medieval-gold border-medieval-gold/30 bg-medieval-gold/10'
                            : 'text-medieval-text-secondary border-medieval-border/30 bg-white/10',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'h-2 w-2 rounded-full',
                        relayerIsDone
                          ? 'bg-green-700'
                          : relayerIsError
                            ? 'bg-red-700'
                            : relayerIsBusy
                              ? 'bg-medieval-gold'
                              : 'bg-medieval-text-secondary/70',
                      ].join(' ')}
                    />
                    {relayerPhaseLabel}
                  </div>
                </div>
              </div>

              {(relayerPhase === 'waiting_for_commits' || relayerPhase === 'waiting_for_reveals') && (
                <div className="text-xs font-medieval text-medieval-text-secondary">
                  {relayerPhase === 'waiting_for_commits'
                    ? `Pending transcript commit: ${pendingCommitRoles.length ? pendingCommitRoles.join(' / ') : 'none'}`
                    : `Pending board reveal: ${pendingRevealRoles.length ? pendingRevealRoles.join(' / ') : 'none'}`}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <MedievalButton
                  variant="primary"
                  size="sm"
                  disabled={!canFinalizeOnChain}
                  onClick={finalizeOnChain}
                >
                  {finalizeCtaLabel}
                </MedievalButton>
                {settleStatus?.txHash && (
                  <div className="text-[11px] font-medieval text-medieval-text-secondary break-all">
                    Tx: {settleStatus.txHash}
                  </div>
                )}
              </div>

              {settleStatus?.error && (
                <div className="text-xs font-medieval text-red-900/80">
                  Relayer error: {settleStatus.error}
                </div>
              )}

              {settleMessage && (
                <div className="text-xs font-medieval text-medieval-text-secondary">
                  {settleMessage}
                </div>
              )}

              <div className="text-[11px] font-medieval text-medieval-text-secondary">
                Relay status version: {settleStatus?.statusVersion ?? 0}
                {typeof settleStatus?.phaseUpdatedAt === 'number'
                  ? ` · updated ${new Date(settleStatus.phaseUpdatedAt).toLocaleTimeString()}`
                  : ''}
              </div>

              {showAdvanced && (
                <div className="text-[11px] font-medieval text-medieval-text-secondary break-all">
                  Relayer digest: {relayerTranscriptDigestHex || '(not ready)'}
                </div>
              )}
            </div>
          </MedievalPanel>
        </div>

        {showAdvanced && (
          <MedievalPanel title="SETTLE ON-CHAIN (ADVANCED)">
            <div className="space-y-3">
              <div className="text-xs font-medieval text-medieval-text-secondary">
                Manual workflow (debug): commit digest, generate proof, then submit `end_game()`.
              </div>
              <div className="text-xs font-medieval text-medieval-text-secondary">
                Prover command:{' '}
                <span className="font-mono">
                  cargo run --release --manifest-path proofs/zk-battleship-risc0/host/Cargo.toml -- --input input.json --out proof.json
                </span>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medieval text-medieval-text-secondary uppercase tracking-widest">
                  Transcript Digest (sha256) On-Chain
                </div>
                <div className="text-xs font-mono break-all bg-white/20 border border-medieval-border/30 rounded p-2">
                  P1: {onChainTranscriptHex.p1 || '(not committed)'}
                  {'\n'}
                  P2: {onChainTranscriptHex.p2 || '(not committed)'}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <MedievalButton
                    variant="primary"
                    size="sm"
                    disabled={!canCommitTranscript}
                    onClick={async () => {
                      if (!address || !signer || !myRole) return;
                      setSettleMessage('');
                      setCommittingTranscript(true);
                      try {
                        const digestBytes = hexToBytes(relayerTranscriptDigestHex);
                        await service.commitTranscript(sessionId, address, digestBytes, signer);
                        await relay.markTranscriptCommitted({ role: myRole, transcriptDigestHex: relayerTranscriptDigestHex });
                        setSettleMessage('Committed transcript digest on-chain.');
                      } catch (err: any) {
                        console.error(err);
                        setSettleMessage(err?.message ? `Commit failed: ${err.message}` : 'Commit failed.');
                      } finally {
                        setCommittingTranscript(false);
                      }
                    }}
                  >
                    {committingTranscript ? 'COMMITTING...' : 'COMMIT TRANSCRIPT DIGEST'}
                  </MedievalButton>
                  <div className="text-[11px] font-medieval text-medieval-text-secondary break-all">
                    Required before settlement. Relayer digest: {relayerTranscriptDigestHex || '(not ready)'}
                  </div>
                </div>
                {transcriptCommittedByBoth && !transcriptMatchesOnChain && (
                  <div className="text-xs font-medieval text-red-900/80">
                    Warning: both players committed a transcript digest, but they do not match. `end_game()` will fail.
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <MedievalButton
                  variant="secondary"
                  size="sm"
                  disabled={!activeMatch || !address}
                  onClick={copyProverInputTemplate}
                >
                  {copiedKey === 'proverInput' ? 'COPIED' : 'COPY PROVER INPUT (JSON)'}
                </MedievalButton>
                <MedievalButton
                  variant="secondary"
                  size="sm"
                  onClick={pasteProofJson}
                >
                  PASTE PROOF JSON
                </MedievalButton>
                <div className="text-[11px] font-medieval text-medieval-text-secondary">
                  Tip: both players reveal their `*_board_bits_hex` and `*_salt_hex` after the match to generate a proof.
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-medieval text-medieval-text-secondary uppercase tracking-widest">
                    Seal (hex, 260 bytes)
                  </div>
                  <textarea
                    className="w-full h-28 px-3 py-2 bg-white/30 border border-medieval-border rounded font-mono text-xs"
                    placeholder="73c457ba..."
                    value={settleSealHex}
                    onChange={(e) => setSettleSealHex(e.target.value)}
                  />
                  <div className="text-[11px] font-medieval text-medieval-text-secondary">
                    Parsed length: {settleSealBytesLen < 0 ? 'invalid' : `${settleSealBytesLen} bytes`}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medieval text-medieval-text-secondary uppercase tracking-widest">
                    Journal (hex, 105 bytes)
                  </div>
                  <textarea
                    className="w-full h-28 px-3 py-2 bg-white/30 border border-medieval-border rounded font-mono text-xs"
                    placeholder="0000002a00000000..."
                    value={settleJournalHex}
                    onChange={(e) => setSettleJournalHex(e.target.value)}
                  />
                  <div className="text-[11px] font-medieval text-medieval-text-secondary">
                    Parsed length: {settleJournalBytesLen < 0 ? 'invalid' : `${settleJournalBytesLen} bytes`}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <MedievalButton
                  variant="primary"
                  size="sm"
                  disabled={
                    !connected ||
                    !address ||
                    !signer ||
                    !activeMatch ||
                    settling ||
                    !transcriptCommittedByBoth ||
                    !transcriptMatchesOnChain ||
                    settleSealBytesLen !== 260 ||
                    settleJournalBytesLen !== 105
                  }
                  onClick={async () => {
                    if (!address || !signer || !activeMatch) return;
                    setSettleMessage('');
                    setSettling(true);
                    try {
                      const sealBytes = hexToBytes(settleSealHex);
                      const journalBytes = hexToBytes(settleJournalHex);
                      await service.endGame(activeMatch.sessionId, address, sealBytes, journalBytes, signer);
                      setSettleMessage('Submitted end_game() successfully. Check Game Hub for completion.');
                    } catch (err: any) {
                      console.error(err);
                      setSettleMessage(err?.message ? `Settlement failed: ${err.message}` : 'Settlement failed.');
                    } finally {
                      setSettling(false);
                    }
                  }}
                >
                  {settling ? 'SUBMITTING...' : 'SUBMIT end_game()'}
                </MedievalButton>
                <MedievalButton
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSettleSealHex('');
                    setSettleJournalHex('');
                    setSettleMessage('');
                  }}
                >
                  CLEAR
                </MedievalButton>
              </div>
            </div>
          </MedievalPanel>
        )}
      </div>
    </div>
  );
}
