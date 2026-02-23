'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useEventStore } from '@/store/eventStore';
import EventDetailsModal from './EventDetailsModal';
import { 
  Trophy, 
  Flame, 
  Target, 
  Swords, 
  Shield, 
  Star, 
  Calendar,
  Gift,
  Zap,
  Crown
} from 'lucide-react';
import { EventType } from '@/types/events';

/**
 * Иконки для каждого типа события
 */
const eventIcons: Record<string, any> = {
  TOURNAMENT: Trophy,
  SHADOW_GLORY_RUSH: Flame,
  ARCHETYPE_MASTERY: Target,
  BOSS_RAID: Swords,
  PERFECT_WARRIOR: Shield,
  RANKED_SEASON: Crown,
  DAILY_QUEST: Calendar,
  MYSTERY_CHEST: Gift,
  REVERSE_BATTLE: Zap,
  SOCIAL_WARFARE: Star,
};

/**
 * Цветовая схема для каждого типа события (в стиле ретро RPG)
 */
const eventColors: Record<string, { 
  bg: string; 
  border: string; 
  text: string;
  glow: string;
}> = {
  tournament: {
    bg: '#4d3a25',
    border: '#e2b045',
    text: '#e2b045',
    glow: '#d9a657',
  },
  shadow_glory_rush: {
    bg: '#3a2520',
    border: '#d24d3a',
    text: '#e2b045',
    glow: '#d9a657',
  },
  archetype_mastery: {
    bg: '#2a3540',
    border: '#4872a3',
    text: '#4872a3',
    glow: '#6a9bc4',
  },
  boss_raid: {
    bg: '#3a2028',
    border: '#d24d3a',
    text: '#d24d3a',
    glow: '#e86055',
  },
  perfect_warrior: {
    bg: '#2a3528',
    border: '#9ac44d',
    text: '#9ac44d',
    glow: '#b5d46e',
  },
  ranked_season: {
    bg: '#3a3020',
    border: '#d9a657',
    text: '#d9a657',
    glow: '#e2b045',
  },
};

interface EventBannerProps {
  onDetailsClick?: () => void;
  compact?: boolean;
}

export default function EventBanner({ onDetailsClick, compact = false }: EventBannerProps) {
  const { 
    currentEvent, 
    myParticipation, 
    fetchCurrentEvent, 
    fetchMyProgress 
  } = useEventStore();
  
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchCurrentEvent();
    fetchMyProgress();
  }, [fetchCurrentEvent, fetchMyProgress]);

  useEffect(() => {
    if (!currentEvent) return;

    const updateTimer = () => {
      const now = Date.now();
      const end = new Date(currentEvent.endDate).getTime();
      const diff = Math.max(0, end - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeLeft({ days, hours, minutes });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);

    return () => clearInterval(interval);
  }, [currentEvent]);

  const handleClick = () => {
    setShowDetailsModal(true);
    if (onDetailsClick) onDetailsClick();
  };

  if (!currentEvent || !currentEvent.isActive) {
    return null;
  }

  const Icon = eventIcons[currentEvent.eventType] || Trophy;
  const eventTypeKey = currentEvent.eventType.toLowerCase().replace(/_/g, '_');
  const colors = eventColors[eventTypeKey] || eventColors.tournament;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6 cursor-pointer"
        onClick={handleClick}
      >
        {/* Ретро RPG стиль баннера */}
        <div 
          className="relative border-4 p-6"
          style={{
            borderColor: colors.border,
            background: `linear-gradient(135deg, ${colors.bg} 0%, #1a1410 100%)`,
            boxShadow: `
              0 0 20px ${colors.glow}40,
              inset 0 0 20px ${colors.bg}80,
              0 4px 0 #000,
              0 8px 0 ${colors.border}40
            `,
          }}
        >
          {/* Декоративные углы (ретро стиль) */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4" style={{ borderColor: colors.text }} />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4" style={{ borderColor: colors.text }} />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4" style={{ borderColor: colors.text }} />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4" style={{ borderColor: colors.text }} />

          <div className="flex items-center justify-between gap-6">
            {/* Левая часть - иконка и текст */}
            <div className="flex items-center gap-6 flex-1">
              {/* Иконка в ретро рамке */}
              <div 
                className="relative p-4 border-2"
                style={{
                  borderColor: colors.border,
                  background: colors.bg,
                  boxShadow: `0 0 15px ${colors.glow}60, inset 0 0 10px ${colors.glow}30`,
                }}
              >
                <Icon 
                  className="w-12 h-12"
                  style={{ color: colors.text }}
                  strokeWidth={2}
                />
                
                {/* Пульсирующий эффект */}
                <motion.div
                  className="absolute inset-0 border-2"
                  style={{ borderColor: colors.glow }}
                  animate={{ 
                    opacity: [0.3, 0.7, 0.3],
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                    ease: "easeInOut" 
                  }}
                />
              </div>

              {/* Информация о событии */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 
                    className="text-2xl font-departure uppercase tracking-wider"
                    style={{ 
                      color: colors.text,
                      textShadow: `2px 2px 0 #000, 0 0 10px ${colors.glow}`,
                    }}
                  >
                    {currentEvent.title}
                  </h3>
                  
                  {/* Бейдж "NEW!" в стиле ретро */}
                  <motion.div
                    className="px-3 py-1 border-2 font-departure text-xs"
                    style={{
                      borderColor: colors.text,
                      background: colors.bg,
                      color: colors.text,
                    }}
                    animate={{ 
                      y: [-2, 2, -2],
                    }}
                    transition={{ 
                      duration: 1.5, 
                      repeat: Infinity,
                      ease: "easeInOut" 
                    }}
                  >
                    NEW!
                  </motion.div>
                </div>
                
                <p className="text-[#bca782] text-sm mb-3">
                  {currentEvent.description}
                </p>

                {/* Тип события и время */}
                <div className="flex items-center gap-4 text-xs text-[#8a7a5a] font-departure">
                  <span>Type: {currentEvent.eventType}</span>
                  <span>•</span>
                  <span>Ends: {new Date(currentEvent.endDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Правая часть - таймер и кнопка */}
            <div className="flex flex-col items-end gap-4">
              {/* Таймер в ретро стиле */}
              <div 
                className="border-2 px-6 py-3"
                style={{
                  borderColor: colors.border,
                  background: '#000',
                  boxShadow: `0 0 15px ${colors.glow}40, inset 0 0 10px ${colors.glow}20`,
                }}
              >
                <div 
                  className="text-4xl font-departure tabular-nums leading-none"
                  style={{ 
                    color: colors.text,
                    textShadow: `0 0 10px ${colors.glow}`,
                  }}
                >
                  {timeLeft.days}D {timeLeft.hours}H
                </div>
                <div className="text-xs text-[#8a7a5a] font-departure text-center mt-1 uppercase">
                  {timeLeft.minutes}M REMAINING
                </div>
              </div>

              {/* Кнопка детали в ретро стиле */}
              <motion.button
                whileHover={{ 
                  scale: 1.05,
                  boxShadow: `0 0 20px ${colors.glow}80`,
                }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 border-2 font-departure text-sm uppercase tracking-wider relative overflow-hidden"
                style={{
                  borderColor: colors.border,
                  background: colors.bg,
                  color: colors.text,
                  boxShadow: `0 4px 0 ${colors.border}80, 0 0 10px ${colors.glow}40`,
                }}
              >
                <span className="relative z-10">Click for details →</span>
                
                {/* Анимированный фон при ховере */}
                <motion.div
                  className="absolute inset-0"
                  style={{ background: colors.glow }}
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 0.2 }}
                />
              </motion.button>
            </div>
          </div>

          {/* Прогресс бар игрока (если участвует) */}
          {myParticipation && myParticipation.score > 0 && (
            <div className="mt-6 pt-6 border-t-2" style={{ borderColor: colors.border }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-departure" style={{ color: colors.text }}>
                  YOUR PROGRESS
                </span>
                <span className="text-sm font-departure" style={{ color: colors.text }}>
                  {myParticipation.score.toLocaleString()} PTS
                </span>
              </div>
              
              <div 
                className="h-4 border-2 relative overflow-hidden"
                style={{
                  background: '#000',
                  borderColor: colors.border,
                }}
              >
                <motion.div
                  className="h-full relative"
                  style={{
                    background: `linear-gradient(90deg, ${colors.border}, ${colors.glow})`,
                  }}
                  initial={{ width: 0 }}
                  animate={{ 
                    width: `${Math.min(100, (myParticipation.score / 1000) * 100)}%` 
                  }}
                  transition={{ duration: 1, ease: "easeOut" }}
                >
                  {/* Сканирующая линия (ретро эффект) */}
                  <motion.div
                    className="absolute inset-0 w-2"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${colors.glow}, transparent)`,
                    }}
                    animate={{
                      x: ['-100%', '200%'],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                </motion.div>
                
                {/* Пиксельные деления на прогресс баре */}
                {[...Array(10)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute h-full w-px bg-black opacity-30"
                    style={{ left: `${(i + 1) * 10}%` }}
                  />
                ))}
              </div>
              
              <div className="text-xs text-[#8a7a5a] font-departure mt-1 text-center">
                RANK #{myParticipation.rank} • {Math.round((myParticipation.score / 1000) * 100)}% TO NEXT MILESTONE
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Event Details Modal */}
      {showDetailsModal && currentEvent && (
        <EventDetailsModal
          event={currentEvent}
          onClose={() => setShowDetailsModal(false)}
        />
      )}
    </>
  );
}
