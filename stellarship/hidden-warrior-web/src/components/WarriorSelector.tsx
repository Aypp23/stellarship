import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Warrior } from '@/types/game';
import { Sword, Shield, Zap, Brain, Backpack } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { MedievalPanel } from './ui/MedievalPanel';
import { MedievalButton } from './ui/MedievalButton';

interface WarriorSelectorProps {
  warriors: Warrior[];
  selectedWarrior: Warrior | null;
  onSelectWarrior: (warrior: Warrior | null) => void;
}

const WarriorSelector: React.FC<WarriorSelectorProps> = ({
  warriors,
  selectedWarrior,
  onSelectWarrior
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Если воинов нет, показываем сообщение
  if (warriors.length === 0) {
    return (
      <MedievalPanel className="text-center">
        <h3 className="text-xl font-medieval text-medieval-gold mb-4">WARRIOR ARCHIVES</h3>
        <p className="text-medieval-text-secondary mb-4">
          You have no warriors yet. Create a warrior to start battling!
        </p>
      </MedievalPanel>
    );
  }

  return (
    <MedievalPanel>
      <div className="flex justify-between items-center mb-4 pb-4 border-b border-medieval-border">
        <h3 className="text-xl font-medieval text-medieval-gold tracking-widest">WARRIOR ARCHIVES</h3>
        <MedievalButton
          onClick={() => setIsExpanded(!isExpanded)}
          variant="secondary"
          size="sm"
        >
          {isExpanded ? 'COLLAPSE' : 'EXPAND'}
        </MedievalButton>
      </div>

      {/* Selected Warrior Display */}
      {selectedWarrior && !isExpanded && (
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="w-24 h-24 border border-medieval-border bg-medieval-bg relative shadow-medieval-inset">
            <img
              src={selectedWarrior.image || "/assets/archetypes/warrior_1.png"}
              alt={selectedWarrior.name}
              className="w-full h-full object-contain mix-blend-multiply"
            />
            <div className="absolute bottom-0 right-0 bg-medieval-metal px-1 text-xs text-medieval-bg">
              LVL {selectedWarrior.level || 1}
            </div>
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <h4 className="text-lg font-medieval text-medieval-text mb-2">{selectedWarrior.name}</h4>
              <div className="text-xs text-medieval-text-secondary">
                XP: {selectedWarrior.experience || 0} | W/L: {selectedWarrior.wins || 0}/{selectedWarrior.losses || 0}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mt-2">
              <div className="flex items-center">
                <Sword className="w-4 h-4 mr-1 text-medieval-accent" />
                <span className="text-medieval-text">{selectedWarrior.strength}</span>
              </div>
              <div className="flex items-center">
                <Zap className="w-4 h-4 mr-1 text-medieval-gold" />
                <span className="text-medieval-text">{selectedWarrior.agility}</span>
              </div>
              <div className="flex items-center">
                <Shield className="w-4 h-4 mr-1 text-medieval-metal" />
                <span className="text-medieval-text">{selectedWarrior.endurance}</span>
              </div>
              <div className="flex items-center">
                <Brain className="w-4 h-4 mr-1 text-medieval-text-secondary" />
                <span className="text-medieval-text">{selectedWarrior.intelligence}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <MedievalButton
              onClick={() => onSelectWarrior(null)}
              variant="danger"
              size="sm"
            >
              CHANGE
            </MedievalButton>
            <MedievalButton
              onClick={() => useGameStore.getState().setScene('inventory')}
              variant="secondary"
              size="sm"
              className="flex items-center justify-center gap-1"
            >
              <Backpack size={14} />
              INV
            </MedievalButton>
          </div>
        </div>
      )}

      {/* Warrior List */}
      {(!selectedWarrior || isExpanded) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warriors.map((warrior) => (
            <motion.div
              key={warrior.id}
              className={`p-2 cursor-pointer border ${selectedWarrior?.id === warrior.id ? 'border-medieval-gold bg-medieval-gold/10' : 'border-transparent hover:border-medieval-border'
                } rounded transition-colors`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                onSelectWarrior(warrior);
                setIsExpanded(false);
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 border border-medieval-border bg-medieval-bg relative shadow-medieval-inset">
                  <img
                    src={warrior.image || "/assets/archetypes/warrior_1.png"}
                    alt={warrior.name}
                    className="w-full h-full object-contain mix-blend-multiply"
                  />
                  <div className="absolute bottom-0 right-0 bg-medieval-metal px-1 text-[10px] text-medieval-bg">
                    LVL {warrior.level || 1}
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-medieval text-medieval-text">{warrior.name}</h4>
                  <div className="text-[10px] text-medieval-text-secondary mb-1">
                    XP: {warrior.experience || 0}
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs mt-1">
                    <div className="flex items-center">
                      <Sword className="w-3 h-3 mr-1 text-medieval-accent" />
                      <span className="text-medieval-text-secondary">{warrior.strength}</span>
                    </div>
                    <div className="flex items-center">
                      <Shield className="w-3 h-3 mr-1 text-medieval-metal" />
                      <span className="text-medieval-text-secondary">{warrior.endurance}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </MedievalPanel>
  );
};

export default WarriorSelector;
