import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronRight, HelpCircle, Play, Settings } from 'lucide-react';

interface MainMenuPanelProps {
  onPlay: () => void;
  onHelp: () => void;
  onSettings: () => void;
}

function MenuItem({
  label,
  icon,
  onClick,
  index,
  reduceMotion,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  index: number;
  reduceMotion: boolean;
}) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, x: reduceMotion ? 0 : -16 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={reduceMotion ? undefined : { x: 4 }}
      whileFocus={reduceMotion ? undefined : { x: 4 }}
      transition={{
        delay: reduceMotion ? 0 : 0.1 * index + 0.25,
        duration: reduceMotion ? 0.01 : 0.45,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="group flex items-center gap-4 w-full text-left transition-all duration-300 py-3 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-medieval-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40"
      onClick={onClick}
    >
      <div className="text-white/40 group-hover:text-[#C5A572] group-focus-visible:text-[#C5A572] transition-colors duration-200">
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="uppercase tracking-[0.15em] text-2xl text-[#E5E1D3] group-hover:text-[#C5A572] group-focus-visible:text-[#C5A572] drop-shadow-md font-bold transition-colors duration-200">
          {label}
        </span>
      </div>
      <div className="ml-auto transition-all duration-300 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0">
        <ChevronRight className="w-4 h-4 text-[#C5A572]" />
      </div>
    </motion.button>
  );
}

export default function MainMenuPanel({ onPlay, onHelp, onSettings }: MainMenuPanelProps) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="flex flex-col space-y-3">
      <MenuItem label="Play" icon={<Play size={24} />} onClick={onPlay} index={0} reduceMotion={!!reduceMotion} />
      <MenuItem
        label="How It Works"
        icon={<HelpCircle size={20} />}
        onClick={onHelp}
        index={1}
        reduceMotion={!!reduceMotion}
      />
      <MenuItem
        label="Settings"
        icon={<Settings size={20} />}
        onClick={onSettings}
        index={2}
        reduceMotion={!!reduceMotion}
      />
    </div>
  );
}
