'use client';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import type { LucideIcon } from 'lucide-react';
import { X, Settings as SettingsIcon, Volume2, VolumeX, Music, Eye, EyeOff } from 'lucide-react';
import { useSound } from '@/hooks/useSound';

import { MedievalPanel } from './ui/MedievalPanel';

export function SettingsModal() {
  const { activeModal, closeModal, settings, updateSettings } = useGameStore();
  const { playButtonSound } = useSound();
  const reduceMotion = useReducedMotion();

  if (activeModal !== 'settings') return null;

  const Toggle = ({ label, icon: Icon, checked, onChange }: { label: string; icon: LucideIcon; checked: boolean; onChange: () => void }) => (
    <div className="flex items-center justify-between p-3 bg-medieval-bg-dark/30 border border-medieval-border/30 rounded">
      <div className="flex items-center text-medieval-text text-sm">
        <Icon className="w-4 h-4 mr-3 text-medieval-gold" />
        <label className="font-medieval tracking-wide">{label}</label>
      </div>
      <motion.button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        whileTap={reduceMotion ? undefined : { scale: 0.96 }}
        onClick={() => {
          playButtonSound();
          onChange();
        }}
        className={`relative w-12 h-6 transition-colors duration-300 rounded-sm border-2 ${checked
            ? 'bg-medieval-gold/20 border-medieval-gold'
            : 'bg-black/40 border-medieval-border'
          }`}
      >
        <motion.span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-medieval-gold shadow-sm rounded-sm ${!checked && 'grayscale opacity-50'}`}
          animate={{ x: checked ? 24 : 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 26, duration: reduceMotion ? 0.01 : undefined }}
        />
      </motion.button>
    </div>
  );

  const Slider = ({ label, icon: Icon, value, onChange }: { label: string; icon: LucideIcon; value: number; onChange: (val: number) => void }) => (
    <div className="space-y-2 p-3 bg-medieval-bg-dark/30 border border-medieval-border/30 rounded">
      <div className="flex items-center text-medieval-text text-sm mb-3">
        <Icon className="w-4 h-4 mr-3 text-medieval-gold" />
        <label className="font-medieval tracking-wide">{label}</label>
        <span className="ml-auto font-serif-vintage text-medieval-text-secondary text-xs">{Math.round(value * 100)}%</span>
      </div>
      <div className="relative h-2 bg-black/40 rounded border border-medieval-border/50">
        <motion.div
          className="absolute top-0 left-0 h-full bg-medieval-gold/80 rounded-l"
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: reduceMotion ? 0.01 : 0.2, ease: 'easeOut' }}
        />
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={value}
          onChange={(e) => {
            playButtonSound();
            onChange(parseFloat(e.target.value));
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        {/* Thumb indicator for visual style */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-medieval-gold border-2 border-[#0c0c0c] rotate-45 pointer-events-none"
          animate={{ left: `calc(${value * 100}% - 8px)` }}
          transition={{ duration: reduceMotion ? 0.01 : 0.2, ease: 'easeOut' }}
        />
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduceMotion ? 0.01 : 0.18, ease: 'easeOut' }}
        className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
        onClick={closeModal}
      >
        <motion.div
          initial={{ scale: reduceMotion ? 1 : 0.9, opacity: 0, y: reduceMotion ? 0 : 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: reduceMotion ? 1 : 0.9, opacity: 0, y: reduceMotion ? 0 : 20 }}
          transition={{ duration: reduceMotion ? 0.01 : 0.22, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Settings"
          className="w-full max-w-md"
        >
          <MedievalPanel className="p-6 relative">
            {/* Close Button */}
            <button
              onClick={() => {
                playButtonSound();
                closeModal();
              }}
              aria-label="Close settings"
              className="absolute top-4 right-4 text-medieval-text-secondary hover:text-medieval-gold transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-8">
              <h2 className="font-medieval text-2xl text-medieval-gold tracking-wider flex items-center justify-center gap-3">
                <SettingsIcon className="w-6 h-6" />
                SETTINGS
              </h2>
              <div className="h-px w-32 mx-auto mt-4 bg-gradient-to-r from-transparent via-medieval-gold/50 to-transparent" />
            </div>

            <div className="space-y-4">
              <Toggle
                label="SOUND EFFECTS"
                icon={settings.soundEnabled ? Volume2 : VolumeX}
                checked={settings.soundEnabled}
                onChange={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
              />

              <Toggle
                label="BACKGROUND MUSIC"
                icon={Music}
                checked={settings.musicEnabled}
                onChange={() => updateSettings({ musicEnabled: !settings.musicEnabled })}
              />

              <Toggle
                label="VISUAL EFFECTS"
                icon={settings.effectsEnabled ? Eye : EyeOff}
                checked={settings.effectsEnabled}
                onChange={() => updateSettings({ effectsEnabled: !settings.effectsEnabled })}
              />

              <div className="h-px w-full bg-medieval-border/30 my-4" />

              <Slider
                label="SOUND VOLUME"
                icon={Volume2}
                value={settings.soundVolume}
                onChange={(val) => updateSettings({ soundVolume: val })}
              />

              <Slider
                label="MUSIC VOLUME"
                icon={Music}
                value={settings.musicVolume}
                onChange={(val) => updateSettings({ musicVolume: val })}
              />
            </div>

            <div className="mt-6 text-center">
              <div className="font-serif-vintage text-xs text-medieval-text-secondary/60 italic">
                Game data is stored locally in your browser.<br />
                Connect a Stellar testnet wallet to create and join matches.
              </div>
            </div>
          </MedievalPanel>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
