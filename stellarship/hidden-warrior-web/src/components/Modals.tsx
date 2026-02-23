'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { X, Settings as SettingsIcon, Volume2, VolumeX, Music, Eye, EyeOff } from 'lucide-react';
import { useSound } from '@/hooks/useSound';
import FaucetButton from './FaucetButton';

import { MedievalPanel } from './ui/MedievalPanel';
import { MedievalButton } from './ui/MedievalButton';

export function SettingsModal() {
  const { activeModal, closeModal, settings, updateSettings } = useGameStore();
  const { playButtonSound } = useSound();

  if (activeModal !== 'settings') return null;

  const Toggle = ({ label, icon: Icon, checked, onChange }: { label: string; icon: any; checked: boolean; onChange: () => void }) => (
    <div className="flex items-center justify-between p-3 bg-medieval-bg-dark/30 border border-medieval-border/30 rounded">
      <div className="flex items-center text-medieval-text text-sm">
        <Icon className="w-4 h-4 mr-3 text-medieval-gold" />
        <label className="font-medieval tracking-wide">{label}</label>
      </div>
      <button
        onClick={() => {
          playButtonSound();
          onChange();
        }}
        className={`relative w-12 h-6 transition-colors duration-300 rounded-sm border-2 ${checked
            ? 'bg-medieval-gold/20 border-medieval-gold'
            : 'bg-black/40 border-medieval-border'
          }`}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-medieval-gold shadow-sm transition-transform duration-300 rounded-sm ${checked ? 'translate-x-6' : 'translate-x-0'
            } ${!checked && 'grayscale opacity-50'}`}
        />
      </button>
    </div>
  );

  const Slider = ({ label, icon: Icon, value, onChange }: { label: string; icon: any; value: number; onChange: (val: number) => void }) => (
    <div className="space-y-2 p-3 bg-medieval-bg-dark/30 border border-medieval-border/30 rounded">
      <div className="flex items-center text-medieval-text text-sm mb-3">
        <Icon className="w-4 h-4 mr-3 text-medieval-gold" />
        <label className="font-medieval tracking-wide">{label}</label>
        <span className="ml-auto font-serif-vintage text-medieval-text-secondary text-xs">{Math.round(value * 100)}%</span>
      </div>
      <div className="relative h-2 bg-black/40 rounded border border-medieval-border/50">
        <div
          className="absolute top-0 left-0 h-full bg-medieval-gold/80 rounded-l"
          style={{ width: `${value * 100}%` }}
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
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-medieval-gold border-2 border-[#0c0c0c] rotate-45 pointer-events-none"
          style={{ left: `calc(${value * 100}% - 8px)` }}
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
        className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
        onClick={closeModal}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md"
        >
          <MedievalPanel className="p-6 relative">
            {/* Close Button */}
            <button
              onClick={() => {
                playButtonSound();
                closeModal();
              }}
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

            {/* Devnet Tokens Section */}
            <div className="mt-8 pt-6 border-t border-medieval-border/30">
              <div className="text-center mb-4">
                <div className="font-medieval text-medieval-text mb-1">
                  DEVNET TOKENS
                </div>
                <p className="font-serif-vintage text-xs text-medieval-text-secondary">
                  Get test SOL for development and testing
                </p>
              </div>
              <FaucetButton
                size="md"
                showBalance={true}
                className="w-full"
              />
            </div>

            <div className="mt-6 text-center">
              <div className="font-serif-vintage text-xs text-medieval-text-secondary/60 italic">
                Game data is stored locally in your browser.<br />
                Connect your Solana wallet for server-synced statistics.
              </div>
            </div>
          </MedievalPanel>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
