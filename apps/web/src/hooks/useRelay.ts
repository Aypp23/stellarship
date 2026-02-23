'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { RELAY_URL } from '@/lib/stellar/constants';

export type Shot = { x: number; y: number };
export type MoveSendPayload = { sessionId: number; from: string; turn: number; shots: Shot[] };
export type MoveRecvPayload = MoveSendPayload;
export type MoveResultPayload = {
  sessionId: number;
  from: string; // defender
  turn: number;
  results: Array<Shot & { hit: boolean }>;
};

export type SettleStatusPayload = {
  sessionId: string;
  phase: string;
  phaseUpdatedAt?: number | null;
  statusVersion?: number;
  transcriptDigestHex: string;
  modeId: number | null;
  shotsPerTurn: number | null;
  p1: { address: string | null; commitDone: boolean; revealed: boolean };
  p2: { address: string | null; commitDone: boolean; revealed: boolean };
  txHash: string | null;
  error: string | null;
};

export type SettleGetResponse = {
  ok: boolean;
  transcriptDigestHex?: string;
  transcriptHex?: string;
  modeId?: number | null;
  shotsPerTurn?: number | null;
  status?: SettleStatusPayload;
  error?: string;
};

export type RematchOfferPayload = {
  sessionId: number;
  modeId: number;
  newSessionId: number;
  from: string;
  to: string | null;
  authEntryXdr: string;
  createdAt: number;
  expiresAt: number;
};

export type RematchStartedPayload = {
  sessionId: number;
  modeId: number;
  newSessionId: number;
  player1: string;
  player2: string;
  startedBy?: string | null;
  txHash?: string | null;
};

type RelayAck<T = unknown> = {
  ok: boolean;
  error?: string;
} & T;

type RelayState = {
  connected: boolean;
  connectionState: 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';
  connectionError: string | null;
  peerAddresses: string[];
};

type RoomStatePayload = {
  peers?: unknown[];
};

type PeerPayload = {
  address?: unknown;
};

export function useRelay(opts: { sessionId: number; address: string | null; modeId?: number }) {
  const { sessionId, address, modeId } = opts;

  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<
    'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error'
  >('idle');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [peerAddresses, setPeerAddresses] = useState<string[]>([]);

  useEffect(() => {
    if (!sessionId || !address) return;
    setConnectionState('connecting');
    setConnectionError(null);

    const socket = io(RELAY_URL, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 700,
      reconnectionDelayMax: 4000,
    });
    socketRef.current = socket;

    const onConnect = () => {
      setConnected(true);
      setConnectionState('connected');
      setConnectionError(null);
      socket.emit('room:join', { sessionId, address, modeId });
    };
    const onDisconnect = (reason: string) => {
      setConnected(false);
      if (reason === 'io client disconnect') setConnectionState('disconnected');
      else setConnectionState('reconnecting');
      setPeerAddresses([]);
    };
    const onConnectError = (err: Error) => {
      setConnected(false);
      setConnectionState('error');
      setConnectionError(err?.message ?? 'Relay connection error');
    };
    const onReconnectAttempt = () => {
      setConnectionState('reconnecting');
      setConnectionError(null);
    };
    const onReconnectFailed = () => {
      setConnectionState('error');
      setConnectionError('Relay reconnection failed');
    };

    const onRoomState = (payload: RoomStatePayload) => {
      const peers = Array.isArray(payload?.peers)
        ? payload.peers
            .map((p) => String(p ?? ''))
            .filter((p: string) => !!p && p !== address)
        : [];
      setPeerAddresses(Array.from(new Set(peers)));
    };

    const onPeerJoined = (payload: PeerPayload) => {
      const peer = String(payload?.address ?? '');
      if (!peer || peer === address) return;
      setPeerAddresses((prev) => (prev.includes(peer) ? prev : prev.concat(peer)));
    };
    const onPeerLeft = (payload: PeerPayload) => {
      const peer = String(payload?.address ?? '');
      if (!peer || peer === address) return;
      setPeerAddresses((prev) => prev.filter((x) => x !== peer));
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.io.on('reconnect_attempt', onReconnectAttempt);
    socket.io.on('reconnect_failed', onReconnectFailed);
    socket.on('room:state', onRoomState);
    socket.on('room:peer_joined', onPeerJoined);
    socket.on('room:peer_left', onPeerLeft);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.io.off('reconnect_attempt', onReconnectAttempt);
      socket.io.off('reconnect_failed', onReconnectFailed);
      socket.off('room:state', onRoomState);
      socket.off('room:peer_joined', onPeerJoined);
      socket.off('room:peer_left', onPeerLeft);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId, address, modeId]);

  const onMove = useCallback((handler: (payload: MoveRecvPayload) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on('move:recv', handler);
    return () => socket.off('move:recv', handler);
  }, []);

  const onMoveResult = useCallback((handler: (payload: MoveResultPayload) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on('move:result', handler);
    return () => socket.off('move:result', handler);
  }, []);

  const sendMove = useCallback((payload: MoveSendPayload) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('move:send', payload);
  }, []);

  const sendMoveResult = useCallback((payload: MoveResultPayload) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('move:result', payload);
  }, []);

  const emitWithAck = useCallback(async <T extends RelayAck = RelayAck>(eventName: string, payload: unknown, timeoutMs = 12000) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return { ok: false, error: 'Relay not connected' } as T;
    return await new Promise<T>((resolve) => {
      let done = false;
      const cleanup = () => {
        socket.off('disconnect', onDisconnectOnce);
        socket.off('connect_error', onConnectErrorOnce);
      };
      const finish = (value: T) => {
        if (done) return;
        done = true;
        clearTimeout(timeoutId);
        cleanup();
        resolve(value);
      };
      const onDisconnectOnce = () => {
        finish({ ok: false, error: 'Relay disconnected during request.' } as T);
      };
      const onConnectErrorOnce = (err: Error) => {
        finish({ ok: false, error: err?.message ?? 'Relay connection error' } as T);
      };
      const timeoutId = setTimeout(() => {
        finish({ ok: false, error: `Relay request timed out after ${Math.round(timeoutMs / 1000)}s.` } as T);
      }, timeoutMs);
      socket.on('disconnect', onDisconnectOnce);
      socket.on('connect_error', onConnectErrorOnce);
      socket.emit(eventName, payload, (resp: T) => {
        finish(resp ?? ({ ok: false, error: `Relay call failed: ${eventName}` } as T));
      });
    });
  }, []);

  const getSettleInfo = useCallback(async (): Promise<SettleGetResponse> => {
    const socket = socketRef.current;
    if (!socket) return { ok: false, error: 'Relay not connected' };
    return await new Promise((resolve) => {
      socket.emit('settle:get', { sessionId }, (resp: SettleGetResponse) => {
        resolve(resp as SettleGetResponse);
      });
    });
  }, [sessionId]);

  const offerRematch = useCallback(
    async (payload: { newSessionId: number; modeId: number; to?: string | null; authEntryXdr: string }) =>
      await emitWithAck<RelayAck<{ offer?: RematchOfferPayload }>>('rematch:offer', {
        sessionId,
        address,
        ...payload,
      }),
    [emitWithAck, sessionId, address]
  );

  const cancelRematch = useCallback(
    async (payload: { newSessionId?: number }) =>
      await emitWithAck('rematch:cancel', {
        sessionId,
        address,
        ...payload,
      }),
    [emitWithAck, sessionId, address]
  );

  const declineRematch = useCallback(
    async (payload: { newSessionId?: number }) =>
      await emitWithAck('rematch:decline', {
        sessionId,
        address,
        ...payload,
      }),
    [emitWithAck, sessionId, address]
  );

  const announceRematchStarted = useCallback(
    async (payload: {
      newSessionId: number;
      modeId: number;
      player1: string;
      player2: string;
      txHash?: string;
    }) =>
      await emitWithAck('rematch:started', {
        sessionId,
        address,
        ...payload,
      }, 30000),
    [emitWithAck, sessionId, address]
  );

  const getBotInfo = useCallback(async () => await emitWithAck<RelayAck<{ botAddress?: string }>>('bot:get_info', {}), [emitWithAck]);

  const startBotMatch = useCallback(
    async (payload: { player1AuthEntryXdr: string }) =>
      await emitWithAck<
        RelayAck<{
          sessionId?: number;
          modeId?: number;
          player1?: string;
          player2?: string;
          startGameTxHash?: string;
          commitBoardTxHash?: string;
        }>
      >('bot:start_match', payload, 180000),
    [emitWithAck]
  );

  const revealForSettlement = useCallback(
    async (payload: { role: 'p1' | 'p2'; saltHex: string; boardBitsHex: string }) => {
      const socket = socketRef.current;
      if (!socket) return { ok: false, error: 'Relay not connected' } as const;
      return await new Promise<{ ok: boolean; error?: string }>((resolve) => {
        socket.emit(
          'settle:reveal',
          { sessionId, address, ...payload },
          (resp: { ok: boolean; error?: string }) => resolve(resp)
        );
      });
    },
    [sessionId, address]
  );

  const markTranscriptCommitted = useCallback(
    async (payload: { role: 'p1' | 'p2'; transcriptDigestHex?: string }) => {
      const socket = socketRef.current;
      if (!socket) return { ok: false, error: 'Relay not connected' } as const;
      return await new Promise<{ ok: boolean; error?: string }>((resolve) => {
        socket.emit(
          'settle:commit_done',
          { sessionId, address, ...payload },
          (resp: { ok: boolean; error?: string }) => resolve(resp)
        );
      });
    },
    [sessionId, address]
  );

  const onSettleStatus = useCallback((handler: (payload: SettleStatusPayload) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on('settle:status', handler);
    return () => socket.off('settle:status', handler);
  }, []);

  const onRematchOffer = useCallback((handler: (payload: RematchOfferPayload) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on('rematch:offer', handler);
    return () => socket.off('rematch:offer', handler);
  }, []);

  const onRematchDeclined = useCallback((handler: (payload: { sessionId: number; newSessionId: number; from: string }) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on('rematch:declined', handler);
    return () => socket.off('rematch:declined', handler);
  }, []);

  const onRematchCanceled = useCallback((handler: (payload: { sessionId: number; newSessionId: number; from: string }) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on('rematch:canceled', handler);
    return () => socket.off('rematch:canceled', handler);
  }, []);

  const onRematchStarted = useCallback((handler: (payload: RematchStartedPayload) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on('rematch:started', handler);
    return () => socket.off('rematch:started', handler);
  }, []);

  const state: RelayState = useMemo(
    () => ({ connected, connectionState, connectionError, peerAddresses }),
    [connected, connectionState, connectionError, peerAddresses]
  );

  return useMemo(
    () => ({
      ...state,
      onMove,
      onMoveResult,
      sendMove,
      sendMoveResult,
      getSettleInfo,
      offerRematch,
      cancelRematch,
      declineRematch,
      announceRematchStarted,
      getBotInfo,
      startBotMatch,
      revealForSettlement,
      markTranscriptCommitted,
      onSettleStatus,
      onRematchOffer,
      onRematchDeclined,
      onRematchCanceled,
      onRematchStarted,
    }),
    [
      state,
      onMove,
      onMoveResult,
      sendMove,
      sendMoveResult,
      getSettleInfo,
      offerRematch,
      cancelRematch,
      declineRematch,
      announceRematchStarted,
      getBotInfo,
      startBotMatch,
      revealForSettlement,
      markTranscriptCommitted,
      onSettleStatus,
      onRematchOffer,
      onRematchDeclined,
      onRematchCanceled,
      onRematchStarted,
    ]
  );
}
