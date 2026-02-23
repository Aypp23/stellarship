import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Sword, Shield, Trophy, Users, Backpack, Settings } from 'lucide-react';

interface MainMenuPanelProps {
    onEnterArena: () => void;
    onForge: () => void;
    onInventory: () => void;
    onLeaderboard: () => void;
    onGuilds: () => void;
    onSettings: () => void;
    onAdmin?: () => void;
    isAdmin?: boolean;
    playButtonSound: () => void;
    playHoverSound: () => void;
}

interface MenuItemProps {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    isPrimary?: boolean;
    playHoverSound?: () => void;
    index: number;
}

const MenuItem: React.FC<MenuItemProps> = ({ label, onClick, icon, isPrimary, playHoverSound, index }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * index + 0.5, duration: 0.5 }}
            className={`group flex items-center gap-4 w-full text-left transition-all duration-300 ${isPrimary ? 'py-3' : 'py-2'
                }`}
            onClick={onClick}
            onMouseEnter={() => {
                setIsHovered(true);
                playHoverSound?.();
            }}
            onMouseLeave={() => setIsHovered(false)}
        >

            {/* Icon - Moved to Left */}
            <div className={`transition-all duration-300 ${isHovered ? 'text-[#C5A572] scale-110' : 'text-white/40'
                }`}>
                {icon}
            </div>

            {/* Text - Reverted to default font (Departure Mono implied) */}
            <div className="flex flex-col">
                <span
                    className={`uppercase tracking-[0.15em] transition-all duration-300 ${isPrimary
                            ? 'text-2xl text-[#E5E1D3] group-hover:text-[#C5A572] drop-shadow-md font-bold'
                            : 'text-lg text-white/60 group-hover:text-white drop-shadow-sm'
                        }`}
                >
                    {label}
                </span>
            </div>

            {/* End arrow */}
            <div className={`ml-auto transition-all duration-300 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
                <ChevronRight className="w-4 h-4 text-[#C5A572]" />
            </div>

        </motion.button>
    );
};

export const MainMenuPanel: React.FC<MainMenuPanelProps> = ({
    onEnterArena,
    onForge,
    onInventory,
    onLeaderboard,
    onGuilds,
    onSettings,
    onAdmin,
    isAdmin,
    playButtonSound,
    playHoverSound,
}) => {

    const handleAction = (action: () => void) => {
        playButtonSound();
        action();
    };

    return (
        <div className="flex flex-col space-y-3 relative">
            {/* Decorative line - Reduced opacity or removed if needed, keeping simple left border for menu containment? No, user hated lines. Removed it. */}
            {/* Left Guide Line - Making it very subtle or removing. User said "some huge line". I'll keep it clean without lines. */}

            <MenuItem
                label="Enter Arena"
                onClick={() => handleAction(onEnterArena)}
                isPrimary
                playHoverSound={playHoverSound}
                icon={<Sword size={24} />}
                index={0}
            />

            <div className="h-4" /> {/* Spacer */}

            <MenuItem
                label="Warrior Forge"
                onClick={() => handleAction(onForge)}
                playHoverSound={playHoverSound}
                icon={<Shield size={18} />}
                index={1}
            />

            <MenuItem
                label="Inventory"
                onClick={() => handleAction(onInventory)}
                playHoverSound={playHoverSound}
                icon={<Backpack size={18} />}
                index={2}
            />

            <MenuItem
                label="Leaderboard"
                onClick={() => handleAction(onLeaderboard)}
                playHoverSound={playHoverSound}
                icon={<Trophy size={18} />}
                index={3}
            />

            <MenuItem
                label="Guilds"
                onClick={() => handleAction(onGuilds)}
                playHoverSound={playHoverSound}
                icon={<Users size={18} />}
                index={4}
            />

            <MenuItem
                label="Settings"
                onClick={() => handleAction(onSettings)}
                playHoverSound={playHoverSound}
                icon={<Settings size={18} />}
                index={5}
            />

            {isAdmin && (
                <MenuItem
                    label="Admin Panel"
                    onClick={() => handleAction(onAdmin!)}
                    playHoverSound={playHoverSound}
                    index={6}
                />
            )}

        </div>
    );
};

export default MainMenuPanel;
