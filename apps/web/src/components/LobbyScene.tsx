'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, Copy, Share2, Swords } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { io } from 'socket.io-client';
import { useGameStore } from '@/store/gameStore';
import { useStellarWallet } from '@/components/StellarWalletProvider';
import { MedievalPanel } from '@/components/ui/MedievalPanel';
import { MedievalButton } from '@/components/ui/MedievalButton';
import { RELAY_URL } from '@/lib/stellar/constants';
import { ZkBattleshipService } from '@/lib/stellar/zkBattleshipService';

const MODE_CLASSIC = 0 as const;
const MODE_SALVO = 1 as const;

function randomSessionId() {
  return Math.floor(Math.random() * 1_000_000_000);
}

export default function LobbyScene() {
  const { setScene, setActiveMatch } = useGameStore();
  const { connected, address, signer, walletId, supportsSignAuthEntry } = useStellarWallet();

  const service = useMemo(() => new ZkBattleshipService(), []);
  const reduceMotion = useReducedMotion();

  const [modeId, setModeId] = useState<0 | 1>(MODE_CLASSIC);
  const [matchType, setMatchType] = useState<'pvp' | 'bot'>('pvp');
  const [sessionId, setSessionId] = useState<number>(() => randomSessionId());
  const [player2Address, setPlayer2Address] = useState<string>('');

  const [inviteXdr, setInviteXdr] = useState<string>('');
  const [joinXdr, setJoinXdr] = useState<string>('');
  const [joinParsed, setJoinParsed] = useState<null | ReturnType<ZkBattleshipService['parseAuthEntry']>>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [, setCreateStage] = useState<
    'idle' | 'preparing' | 'signing' | 'relay' | 'verifying' | 'ready' | 'error'
  >('idle');
  const [, setJoinStage] = useState<
    'idle' | 'parsing' | 'signing' | 'submitting' | 'ready' | 'error'
  >('idle');
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteUrlCopied, setInviteUrlCopied] = useState(false);
  const inviteCopyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inviteUrlCopyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inviteFromUrlHandledRef = useRef(false);

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const relayCall = async (eventName: string, payload: any, timeoutMs = 12000) =>
    await new Promise<any>((resolve, reject) => {
      const socket = io(RELAY_URL, {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: false,
      });

      const timeoutId = setTimeout(() => {
        socket.disconnect();
        reject(new Error(`Relay request timed out after ${Math.round(timeoutMs / 1000)}s.`));
      }, timeoutMs);

      socket.on('connect_error', () => {
        clearTimeout(timeoutId);
        socket.disconnect();
        reject(new Error('Could not connect to relay.'));
      });

      socket.on('connect', () => {
        socket.emit(eventName, payload, (resp: any) => {
          clearTimeout(timeoutId);
          socket.disconnect();
          if (!resp?.ok) {
            reject(new Error(resp?.error ?? `Relay call failed: ${eventName}`));
            return;
          }
          resolve(resp);
        });
      });
    });

  useEffect(() => {
    return () => {
      if (inviteCopyTimeoutRef.current) clearTimeout(inviteCopyTimeoutRef.current);
      if (inviteUrlCopyTimeoutRef.current) clearTimeout(inviteUrlCopyTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    setInviteXdr('');
    setCreateStage('idle');
    setJoinStage('idle');
    if (matchType === 'bot') setPlayer2Address('');
  }, [matchType]);

  useEffect(() => {
    if (inviteFromUrlHandledRef.current) return;
    inviteFromUrlHandledRef.current = true;
    if (typeof window === 'undefined') return;

    const inviteFromUrl = new URLSearchParams(window.location.search).get('invite');
    if (!inviteFromUrl) return;
    const xdr = inviteFromUrl.trim();
    if (!xdr) return;

    setMatchType('pvp');
    setJoinXdr(xdr);
    try {
      const parsed = service.parseAuthEntry(xdr);
      setJoinParsed(parsed);
      setError(null);
    } catch (err: any) {
      setJoinParsed(null);
      setError(err?.message ?? 'Invite URL is invalid.');
    }
  }, [service]);

  const extractInviteXdr = (input: string): string => {
    const raw = input.trim();
    if (!raw) return '';
    try {
      const asUrl = new URL(raw);
      const fromQuery = asUrl.searchParams.get('invite');
      if (fromQuery) return fromQuery.trim();
    } catch {
      // not a URL, continue
    }
    return raw;
  };

  const buildInviteUrl = (authEntryXdr: string): string => {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('invite', authEntryXdr.trim());
    return url.toString();
  };

  return (
    <div className="min-h-screen bg-medieval-bg bg-medieval-paper">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <MedievalButton variant="secondary" size="sm" onClick={() => setScene('menu')}>
            <ArrowLeft className="w-4 h-4" />
            BACK
          </MedievalButton>
          <div className="font-medieval text-medieval-text-secondary text-xs tracking-widest uppercase">
            {connected && address ? `You: ${address}` : 'Wallet not connected'}
          </div>
        </div>

        <AnimatePresence initial={false}>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
              transition={{ duration: reduceMotion ? 0.01 : 0.18, ease: 'easeOut' }}
              className="bg-red-500/10 border border-red-500/30 text-red-900 p-4 rounded"
            >
              <div className="font-medieval text-sm">{error}</div>
            </motion.div>
          )}
        </AnimatePresence>

        <MedievalPanel title="CHOOSE OPPONENT">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <MedievalButton
                variant={matchType === 'pvp' ? 'gold' : 'secondary'}
                size="sm"
                aria-pressed={matchType === 'pvp'}
                aria-label="Play versus another player"
                onClick={() => setMatchType('pvp')}
              >
                PLAYER VS PLAYER
              </MedievalButton>
              <MedievalButton
                variant={matchType === 'bot' ? 'gold' : 'secondary'}
                size="sm"
                aria-pressed={matchType === 'bot'}
                aria-label="Play versus computer"
                onClick={() => setMatchType('bot')}
              >
                VS COMPUTER
              </MedievalButton>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={matchType}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
                transition={{ duration: reduceMotion ? 0.01 : 0.22, ease: 'easeOut' }}
                className="text-xs font-medieval text-medieval-text-secondary"
              >
                {matchType === 'pvp'
                  ? 'PvP selected: create an invite or paste one to join.'
                  : 'Computer selected: start immediately, no join flow needed.'}
              </motion.div>
            </AnimatePresence>
          </div>
        </MedievalPanel>

        <div className={matchType === 'bot' ? 'max-w-3xl mx-auto w-full' : ''}>
          <div className={`grid grid-cols-1 ${matchType === 'pvp' ? 'lg:grid-cols-2' : ''} gap-8 items-start`}>
            <motion.div
              layout
              transition={{ duration: reduceMotion ? 0.01 : 0.24, ease: 'easeOut' }}
            >
              <MedievalPanel title="CREATE MATCH">
                <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <MedievalButton
                  variant={modeId === MODE_CLASSIC ? 'gold' : 'secondary'}
                  size="sm"
                  aria-pressed={modeId === MODE_CLASSIC}
                  aria-label="Select classic mode"
                  onClick={() => setModeId(MODE_CLASSIC)}
                >
                  CLASSIC
                </MedievalButton>
                <MedievalButton
                  variant={modeId === MODE_SALVO ? 'gold' : 'secondary'}
                  size="sm"
                  aria-pressed={modeId === MODE_SALVO}
                  aria-label="Select salvo mode"
                  onClick={() => setModeId(MODE_SALVO)}
                >
                  SALVO
                </MedievalButton>
              </div>

              <div className="space-y-2">
                <div className="font-medieval text-xs tracking-widest text-medieval-text-secondary uppercase">
                  Session Id
                </div>
                <div className="flex gap-2">
                  <input
                    className="w-full px-3 py-2 bg-white/40 border border-medieval-border rounded font-medieval text-sm"
                    value={String(sessionId)}
                    onChange={(e) => setSessionId(Number(e.target.value || '0'))}
                  />
                  <MedievalButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setSessionId(randomSessionId())}
                  >
                    REROLL
                  </MedievalButton>
                </div>
              </div>

              {matchType === 'pvp' && (
                <div className="space-y-2">
                  <div className="font-medieval text-xs tracking-widest text-medieval-text-secondary uppercase">
                    Opponent Address (optional)
                  </div>
                  <input
                    className="w-full px-3 py-2 bg-white/40 border border-medieval-border rounded font-medieval text-sm"
                    placeholder="G... (leave blank for open invite)"
                    value={player2Address}
                    onChange={(e) => setPlayer2Address(e.target.value.trim())}
                  />
                </div>
              )}

              <div className="pt-2">
                <MedievalButton
                  variant="primary"
                  fullWidth
                  disabled={creating || !supportsSignAuthEntry}
                  onClick={async () => {
                    setError(null);
                    setCreateStage('preparing');
                    if (!connected || !address) {
                      setCreateStage('error');
                      setError('Connect a Stellar wallet first.');
                      return;
                    }
                    if (!supportsSignAuthEntry) {
                      const walletLabel = walletId || 'This wallet';
                      setCreateStage('error');
                      setError(
                        `${walletLabel} does not support signAuthEntry. Use Freighter to generate an invite, then reconnect this wallet to join/play.`
                      );
                      return;
                    }
                    if (creating) return;
                    setCreating(true);
                    try {
                      const p1 = BigInt(0);
                      const p2 = BigInt(0);
                      let botAddress = '';
                      if (matchType === 'bot') {
                        setCreateStage('relay');
                        const botInfo = await relayCall('bot:get_info', {});
                        botAddress = String(botInfo?.botAddress ?? '');
                        if (!botAddress) throw new Error('Relay bot address is unavailable.');

                        setCreateStage('signing');
                        const authEntryXdr = await service.prepareStartGame(
                          sessionId,
                          modeId,
                          address,
                          botAddress,
                          p1,
                          p2,
                          signer
                        );

                        setCreateStage('relay');
                        const started = await relayCall(
                          'bot:start_match',
                          {
                            sessionId,
                            modeId,
                            player1: address,
                            player1AuthEntryXdr: authEntryXdr,
                          },
                          180000
                        );

                        setCreateStage('ready');
                        setInviteXdr('');
                        setActiveMatch({
                          sessionId: Number(started?.sessionId ?? sessionId),
                          modeId: Number(started?.modeId ?? modeId) as 0 | 1,
                          player1: address,
                          player2: String(started?.player2 ?? botAddress),
                          isBotMatch: true,
                        });
                        setScene('match');
                      } else {
                        setCreateStage('signing');
                        const authEntryXdr = await service.prepareStartGame(
                          sessionId,
                          modeId,
                          address,
                          player2Address,
                          p1,
                          p2,
                          signer
                        );
                        setCreateStage('ready');
                        setInviteXdr(authEntryXdr);
                        setActiveMatch({
                          sessionId,
                          modeId,
                          player1: address,
                          player2: player2Address || null,
                          isBotMatch: false,
                        });
                      }
                    } catch (err: any) {
                      const message = err?.message ?? (matchType === 'bot' ? 'Failed to start bot match' : 'Failed to generate invite');
                      if (matchType === 'bot' && /timed out/i.test(String(message))) {
                        setCreateStage('verifying');
                        const deadline = Date.now() + 45000;
                        while (Date.now() < deadline) {
                          try {
                            const session = await service.getSession(sessionId, address);
                            if (session) {
                              setInviteXdr('');
                              setActiveMatch({
                                sessionId,
                                modeId,
                                player1: address,
                                player2: String((session as any).player2 ?? null),
                                isBotMatch: true,
                              });
                              setCreateStage('ready');
                              setScene('match');
                              return;
                            }
                          } catch {
                            // keep polling until deadline
                          }
                          await new Promise((resolve) => setTimeout(resolve, 2500));
                        }
                      }
                      setInviteXdr('');
                      setCreateStage('error');
                      setError(message);
                    } finally {
                      setCreating(false);
                    }
                  }}
                >
                  <Swords className="w-4 h-4" />
                  {creating ? 'STARTING...' : matchType === 'bot' ? 'START VS COMPUTER' : 'GENERATE INVITE'}
                </MedievalButton>
                {!supportsSignAuthEntry && (
                  <div className="mt-2 text-xs font-medieval text-medieval-text-secondary">
                    This connected wallet cannot create invite auth entries. Freighter is required for invite generation.
                  </div>
                )}
              </div>

              {inviteXdr && matchType === 'pvp' && (
                <div className="space-y-2 pt-3">
                  <div className="font-medieval text-xs tracking-widest text-medieval-text-secondary uppercase">
                    Invite (Auth Entry XDR)
                  </div>
                  <textarea
                    className="w-full h-28 px-3 py-2 bg-white/40 border border-medieval-border rounded font-mono text-xs"
                    value={inviteXdr}
                    readOnly
                  />
                  <div className="flex gap-2">
                    <MedievalButton
                      variant="secondary"
                      size="sm"
                      onClick={async () => {
                        await copy(inviteXdr);
                        setInviteCopied(true);
                        if (inviteCopyTimeoutRef.current) clearTimeout(inviteCopyTimeoutRef.current);
                        inviteCopyTimeoutRef.current = setTimeout(() => {
                          setInviteCopied(false);
                          inviteCopyTimeoutRef.current = null;
                        }, 1500);
                      }}
                    >
                      <Copy className="w-4 h-4" />
                      {inviteCopied ? 'COPIED' : 'COPY'}
                    </MedievalButton>
                    <MedievalButton
                      variant="gold"
                      size="sm"
                      onClick={() => {
                        setScene('match');
                      }}
                    >
                      ENTER MATCH
                    </MedievalButton>
                    <MedievalButton
                      variant="secondary"
                      size="sm"
                      className="min-w-[52px] px-3"
                      aria-label="Share invite URL"
                      title={inviteUrlCopied ? 'Invite shared' : 'Share invite URL'}
                      onClick={async () => {
                        const inviteUrl = buildInviteUrl(inviteXdr);
                        if (!inviteUrl) return;
                        let shared = false;
                        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
                          try {
                            await navigator.share({
                              title: 'Stellarship Invite',
                              text: 'Join my Stellarship match.',
                              url: inviteUrl,
                            });
                            shared = true;
                          } catch (err: any) {
                            if (err?.name === 'AbortError') return;
                          }
                        }
                        if (!shared) await copy(inviteUrl);
                        setInviteUrlCopied(true);
                        if (inviteUrlCopyTimeoutRef.current) clearTimeout(inviteUrlCopyTimeoutRef.current);
                        inviteUrlCopyTimeoutRef.current = setTimeout(() => {
                          setInviteUrlCopied(false);
                          inviteUrlCopyTimeoutRef.current = null;
                        }, 1500);
                      }}
                    >
                      {inviteUrlCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                    </MedievalButton>
                  </div>
                </div>
              )}
                </div>
              </MedievalPanel>
            </motion.div>

          <AnimatePresence initial={false}>
            {matchType === 'pvp' && (
              <motion.div
                key="join-match-panel"
                initial={{ opacity: 0, x: reduceMotion ? 0 : 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: reduceMotion ? 0 : 24 }}
                transition={{ duration: reduceMotion ? 0.01 : 0.24, ease: 'easeOut' }}
              >
                <MedievalPanel title="JOIN MATCH">
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <div className="font-medieval text-xs tracking-widest text-medieval-text-secondary uppercase">
                        Paste Invite URL or Auth Entry XDR
                      </div>
                      <textarea
                        className="w-full h-28 px-3 py-2 bg-white/40 border border-medieval-border rounded font-mono text-xs"
                        value={joinXdr}
                        onChange={(e) => setJoinXdr(e.target.value.trim())}
                      />
                    </div>

                    <div className="flex gap-2">
                      <MedievalButton
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setError(null);
                          setJoinParsed(null);
                          const invite = extractInviteXdr(joinXdr);
                          if (!invite) return;
                          setJoinStage('parsing');
                          try {
                            const parsed = service.parseAuthEntry(invite);
                            if (invite !== joinXdr) setJoinXdr(invite);
                            setJoinParsed(parsed);
                            setJoinStage('idle');
                          } catch (err: any) {
                            setJoinStage('error');
                            setError(err?.message ?? 'Failed to parse auth entry');
                          }
                        }}
                      >
                        PARSE INVITE
                      </MedievalButton>
                    </div>

                    {joinParsed && (
                      <div className="space-y-3">
                        <div className="text-sm font-medieval text-medieval-text">
                          <div className="text-medieval-text-secondary text-xs tracking-widest uppercase mb-1">Session</div>
                          {joinParsed.sessionId}
                        </div>
                        <div className="text-sm font-medieval text-medieval-text">
                          <div className="text-medieval-text-secondary text-xs tracking-widest uppercase mb-1">Mode</div>
                          {joinParsed.modeId === MODE_CLASSIC ? 'Classic' : joinParsed.modeId === MODE_SALVO ? 'Salvo' : `Unknown (${joinParsed.modeId})`}
                        </div>
                        <div className="text-sm font-medieval text-medieval-text break-all">
                          <div className="text-medieval-text-secondary text-xs tracking-widest uppercase mb-1">Player 1</div>
                          {joinParsed.player1}
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      <MedievalButton
                        variant="primary"
                        fullWidth
                        onClick={async () => {
                          setError(null);
                          setJoinStage('signing');
                          if (!connected || !address) {
                            setJoinStage('error');
                            setError('Connect a Stellar wallet first.');
                            return;
                          }
                          const invite = extractInviteXdr(joinXdr);
                          if (!invite) {
                            setJoinStage('error');
                            setError('Paste an invite URL or auth entry XDR first.');
                            return;
                          }
                          if (joining) return;
                          setJoining(true);
                          try {
                            const p2 = BigInt(0);
                            setJoinStage('signing');
                            const txXdr = await service.importAndSignAuthEntry(
                              invite,
                              address,
                              p2,
                              signer
                            );
                            setJoinStage('submitting');
                            await service.finalizeStartGame(txXdr, address, signer);
                            const parsed = service.parseAuthEntry(invite);
                            setActiveMatch({
                              sessionId: parsed.sessionId,
                              modeId: parsed.modeId as 0 | 1,
                              player1: parsed.player1,
                              player2: address,
                              isBotMatch: false,
                            });
                            setJoinStage('ready');
                            setScene('match');
                          } catch (err: any) {
                            setJoinStage('error');
                            setError(err?.message ?? 'Failed to start game');
                          } finally {
                            setJoining(false);
                          }
                        }}
                      >
                        {joining ? 'STARTING...' : 'START GAME'}
                      </MedievalButton>
                    </div>
                  </div>
                </MedievalPanel>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </div>
      </div>
    </div>
  );
}
