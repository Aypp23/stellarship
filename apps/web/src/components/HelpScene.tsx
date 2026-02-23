'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { MedievalPanel } from '@/components/ui/MedievalPanel';
import { MedievalButton } from '@/components/ui/MedievalButton';

export default function HelpScene() {
  const { setScene } = useGameStore();
  const [openSection, setOpenSection] = useState<'goal' | 'zk' | 'modes' | 'auth' | null>('goal');
  const reduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen bg-medieval-bg bg-medieval-paper">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <MedievalButton variant="secondary" size="sm" onClick={() => setScene('menu')}>
            <ArrowLeft className="w-4 h-4" />
            BACK
          </MedievalButton>
        </div>

        <MedievalPanel title="HOW IT WORKS">
          <div className="space-y-3 font-medieval text-sm text-medieval-text leading-relaxed">
            {[
              {
                id: 'goal' as const,
                title: 'GOAL',
                body: (
                  <div>
                    Play a hidden-information match (Battleship-style). You keep your board private, but the game can still
                    be settled fairly.
                  </div>
                ),
              },
              {
                id: 'zk' as const,
                title: 'ZK MECHANIC',
                body: (
                  <div className="space-y-2">
                    <div>1) Both players commit to a secret board on-chain.</div>
                    <div>2) You exchange moves off-chain during play (relay only, not trusted).</div>
                    <div>
                      3) At the end, the winner submits a zero-knowledge proof that the entire transcript was valid for both
                      committed boards, without revealing the boards.
                    </div>
                  </div>
                ),
              },
              {
                id: 'modes' as const,
                title: 'MODES',
                body: (
                  <div className="space-y-2">
                    <div>
                      <span className="font-bold">Classic</span>: one shot per turn.
                    </div>
                    <div>
                      <span className="font-bold">Salvo</span>: multiple shots per turn (count derived from remaining ship
                      cells).
                    </div>
                    <div className="text-medieval-text-secondary">
                      Mode choice is enforced on-chain: it is included in the `start_game` auth-entry args, so both players sign
                      it.
                    </div>
                  </div>
                ),
              },
              {
                id: 'auth' as const,
                title: 'SGS AUTH-ENTRY FLOW',
                body: (
                  <div className="space-y-2 text-medieval-text-secondary">
                    <div>Player 1 generates a signed Soroban authorization entry (XDR) for `start_game` and shares it.</div>
                    <div>
                      Player 2 imports it, rebuilds the transaction, injects Player 1’s auth entry, signs their own auth entry,
                      and submits.
                    </div>
                  </div>
                ),
              },
            ].map((section) => {
              const isOpen = openSection === section.id;
              return (
                <div key={section.id} className="rounded border border-medieval-border/30 bg-white/10 overflow-hidden">
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left flex items-center justify-between"
                    aria-expanded={isOpen}
                    onClick={() => setOpenSection((prev) => (prev === section.id ? null : section.id))}
                  >
                    <span className="text-medieval-gold font-bold tracking-widest">{section.title}</span>
                    <span className="inline-flex items-center gap-2 text-medieval-text-secondary text-xs">
                      {isOpen ? 'HIDE' : 'VIEW'}
                      <motion.span
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: reduceMotion ? 0.01 : 0.18, ease: 'easeOut' }}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </motion.span>
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: reduceMotion ? 0.01 : 0.2, ease: 'easeOut' }}
                        className="px-3 pb-3"
                      >
                        {section.body}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </MedievalPanel>
      </div>
    </div>
  );
}
