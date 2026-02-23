import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { MedievalButton } from '@/components/ui/MedievalButton';
import { useStellarWallet } from '@/components/StellarWalletProvider';

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
}

export default function WalletStatusPanel() {
  const { connected, address, connect, disconnect } = useStellarWallet();
  const [busy, setBusy] = useState(false);
  const [justConnected, setJustConnected] = useState(false);
  const prevConnectedRef = useRef(connected);
  const reduceMotion = useReducedMotion();

  const status = useMemo(() => {
    if (!connected || !address) return { label: 'Disconnected', color: 'bg-red-500' };
    return { label: 'Connected', color: 'bg-green-600 shadow-[0_0_4px_rgba(22,163,74,0.6)]' };
  }, [connected, address]);

  useEffect(() => {
    if (!prevConnectedRef.current && connected) {
      setJustConnected(true);
      const id = setTimeout(() => setJustConnected(false), 900);
      prevConnectedRef.current = connected;
      return () => clearTimeout(id);
    }
    prevConnectedRef.current = connected;
  }, [connected]);

  // Corner Ornament SVG
  const Corner = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 10 10" className={`absolute w-3 h-3 text-[#8a6a35] opacity-80 ${className}`}>
      <path d="M1 1H9V9" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="3" y="3" width="2" height="2" fill="currentColor" />
    </svg>
  );

  return (
    <div className="relative w-full max-w-2xl mx-auto z-50">
      <div className="relative bg-[#d4c5a0] border-2 border-[#8a6a35] rounded-lg shadow-[0px_4px_0px_0px_#5c4033] overflow-visible">
        <div className="absolute inset-0 opacity-20 bg-[url('/assets/arena-texture.png')] mix-blend-multiply pointer-events-none rounded-lg" />
        <div className="absolute inset-[3px] border border-[#8a6a35]/30 rounded pointer-events-none" />

        <Corner className="top-1.5 left-1.5" />
        <Corner className="top-1.5 right-1.5 rotate-90" />
        <Corner className="bottom-1.5 left-1.5 -rotate-90" />
        <Corner className="bottom-1.5 right-1.5 rotate-180" />

        <div className="relative z-10 p-3 flex items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-3 pl-2">
            <motion.div
              layout
              className="flex items-center gap-2 bg-[#e6d5b0] border border-[#8a6a35]/30 px-3 py-1.5 rounded shadow-inner"
            >
              <motion.div
                className={`w-2 h-2 rounded-full ${status.color}`}
                animate={justConnected && !reduceMotion ? { scale: [1, 1.55, 1] } : { scale: 1 }}
                transition={{ duration: reduceMotion ? 0.01 : 0.32, ease: 'easeOut' }}
              />
              <span className="font-medieval text-xs text-[#5c4033] tracking-wider uppercase">
                {status.label}
              </span>
            </motion.div>
            {address && (
              <div className="hidden sm:block font-medieval text-xs text-[#5c4033]/80 tracking-widest uppercase">
                {shortAddress(address)}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!connected ? (
              <MedievalButton
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await connect();
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    CONNECTING...
                  </span>
                ) : (
                  'CONNECT WALLET'
                )}
              </MedievalButton>
            ) : (
              <MedievalButton
                variant="secondary"
                size="sm"
                onClick={() => disconnect()}
              >
                DISCONNECT
              </MedievalButton>
            )}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {justConnected && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.24, ease: 'easeOut' }}
            className="mt-2 text-center font-medieval text-[10px] tracking-widest uppercase text-[#5c4033]/80"
          >
            Wallet linked.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
