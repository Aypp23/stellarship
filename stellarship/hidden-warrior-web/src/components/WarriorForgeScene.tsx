'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { Warrior } from '@/types/game';
import {
    Sword, Shield, Zap, Heart, Brain, Hammer, Scroll,
    ArrowLeft, User, Backpack, Trophy, Skull, Shuffle, Trash2
} from 'lucide-react';
import { MedievalPanel } from './ui/MedievalPanel';
import { MedievalButton } from './ui/MedievalButton';
import { generateWarriorName } from '@/utils/warriorNames';
import { inventoryApi } from '@/lib/apiClient';
import { WarriorEquipment, InventorySlot } from '@/types/inventory';


import { getItemSpriteCoords, ITEMS_SPRITESHEET, SPRITE_SIZE } from '@/lib/itemMapping';

// Asset Paths
const SPRITE_PATH = '/assets/ui/Sprites';

const ASSETS = {
    SLOT: `${SPRITE_PATH}/UI_TravelBook_Slot01a.png`,
    SLOT_SELECTED: `${SPRITE_PATH}/UI_TravelBook_Slot01b.png`,
    CURSOR: `${SPRITE_PATH}/UI_TravelBook_Select01a.png`,
};

function ItemIcon({ item, size = 'md' }: { item: any, size?: 'sm' | 'md' | 'lg' }) {
    if (!item) return null;

    const coords = getItemSpriteCoords(item);
    const scale = size === 'lg' ? 4 : size === 'md' ? 2.5 : 1.5;

    return (
        <div
            className="flex-shrink-0"
            style={{
                width: `${SPRITE_SIZE}px`,
                height: `${SPRITE_SIZE}px`,
                backgroundImage: `url(${ITEMS_SPRITESHEET})`,
                backgroundPosition: `-${coords.x * SPRITE_SIZE}px -${coords.y * SPRITE_SIZE}px`,
                imageRendering: 'pixelated',
                transform: `scale(${scale})`,
                transformOrigin: 'center',
            }}
        />
    );
}

interface WarriorForgeSceneProps {
    onBack: () => void;
    onBattleStart: (warrior: Warrior) => void;
}

export default function WarriorForgeScene({ onBack, onBattleStart }: WarriorForgeSceneProps) {
    const { warriors, warriorLimit, createWarrior, removeWarrior, isLoading } = useGameStore();
    const [selectedWarrior, setSelectedWarrior] = useState<Warrior | null>(null);
    const [view, setView] = useState<'list' | 'detail'>('list');
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [deletingWarriorId, setDeletingWarriorId] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

    const handleDeleteWarrior = async (warriorId: string) => {
        setDeletingWarriorId(warriorId);
        try {
            await removeWarrior(warriorId);
            setShowDeleteConfirm(null);
        } catch (error) {
            console.error('Failed to delete warrior:', error);
        } finally {
            setDeletingWarriorId(null);
        }
    };

    useEffect(() => {
        // Simulate a brief loading state if the store doesn't provide one, 
        // or wait for the store to be ready.
        if (!isLoading) {
            const timer = setTimeout(() => setIsInitialLoading(false), 500);
            return () => clearTimeout(timer);
        }
    }, [isLoading]);

    const handleWarriorSelect = (warrior: Warrior) => {
        setSelectedWarrior(warrior);
        setView('detail');
    };

    const handleBackToList = () => {
        setSelectedWarrior(null);
        setView('list');
    };

    return (
        <div className="w-full max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
                {view === 'list' ? (
                    <motion.div
                        key="list"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-8">
                            <MedievalButton
                                variant="secondary"
                                onClick={onBack}
                                className="flex items-center gap-2 px-4 py-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                BACK TO MENU
                            </MedievalButton>

                            <div className="text-center">
                                <h1 className="font-medieval text-4xl text-medieval-text tracking-widest">
                                    WARRIOR FORGE
                                </h1>
                                <div className="font-medieval text-medieval-text-secondary text-sm">
                                    MANAGE YOUR ROSTER
                                </div>
                            </div>

                            <div className="w-[120px]" /> {/* Spacer for centering */}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Creation Panel */}
                            <MedievalPanel title="CREATE WARRIOR" className="h-full">
                                <div className="relative">
                                    {/* Loading Overlay - appears when loading warriors or creating */}
                                    {(isInitialLoading || isLoading) && (
                                        <div className="absolute inset-0 bg-black/60 z-20 flex flex-col items-center justify-center rounded-lg backdrop-blur-[1px]">
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                                className="w-10 h-10 border-4 border-medieval-gold border-t-transparent rounded-full mb-3"
                                            />
                                            <div className="font-medieval text-medieval-gold text-sm animate-pulse tracking-widest">
                                                {isLoading ? 'FORGING WARRIOR...' : 'LOADING...'}
                                            </div>
                                        </div>
                                    )}

                                    <div className={`flex items-center justify-between mb-6 border-b border-medieval-border pb-2 ${(isInitialLoading || isLoading) ? 'opacity-40' : ''}`}>
                                        <div className="flex items-center gap-2">
                                            <Hammer className="w-5 h-5 text-medieval-gold" />
                                            <span className="font-medieval text-medieval-text-secondary text-sm">
                                                LIMIT: {warriorLimit.current}/{warriorLimit.max}
                                            </span>
                                        </div>
                                    </div>

                                    <div className={`${(isInitialLoading || isLoading) ? 'opacity-40 pointer-events-none' : ''}`}>
                                        {warriorLimit.current >= warriorLimit.max ? (
                                            <div className="text-center py-8">
                                                <div className="font-medieval text-medieval-accent mb-2">MAXIMUM WARRIORS REACHED</div>
                                                <p className="font-medieval text-medieval-text-secondary text-sm">
                                                    You have reached the maximum number of warriors ({warriorLimit.max}).
                                                    Delete a warrior to create a new one.
                                                </p>
                                            </div>
                                        ) : (
                                            <WarriorCreationForm onWarriorCreated={() => { }} />
                                        )}
                                    </div>
                                </div>
                            </MedievalPanel>

                            {/* Warrior List */}
                            <MedievalPanel title="WARRIOR ARCHIVES" className="h-full">
                                <div className="flex items-center justify-between mb-6 border-b border-medieval-border pb-2">
                                    <div className="flex items-center gap-2">
                                        <Scroll className="w-5 h-5 text-medieval-metal" />
                                        <span className="font-medieval text-medieval-text-secondary text-sm">
                                            {warriors.length} WARRIORS
                                        </span>
                                    </div>
                                </div>

                                {isInitialLoading || isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-12 h-[300px]">
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                            className="w-12 h-12 border-4 border-medieval-gold border-t-transparent rounded-full mb-4"
                                        />
                                        <div className="font-medieval text-medieval-text-secondary text-sm animate-pulse">
                                            SUMMONING WARRIORS...
                                        </div>
                                    </div>
                                ) : warriors.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="font-medieval text-medieval-text text-lg mb-2">
                                            NO WARRIORS FOUND
                                        </div>
                                        <div className="font-medieval text-medieval-text-secondary text-sm">
                                            Create your first warrior to begin
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                        {warriors.map((warrior) => (
                                            <motion.div
                                                key={warrior.id}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="border border-medieval-border bg-medieval-bg/50 p-4 rounded-lg hover:bg-medieval-bg/70 transition-colors"
                                            >
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-16 h-16 bg-medieval-bg border-2 border-medieval-border rounded-md overflow-hidden relative shadow-inner">
                                                            <img
                                                                src={warrior.image || `/assets/archetypes/warrior_${Math.floor(Math.random() * 10) + 1}.png`}
                                                                alt={warrior.name}
                                                                className="w-full h-full object-contain mix-blend-multiply"
                                                            />
                                                            <div className="absolute bottom-0 right-0 bg-medieval-metal px-1.5 py-0.5 text-[10px] text-medieval-bg font-medieval border-t border-l border-medieval-border">
                                                                LVL {warrior.level || 1}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="font-medieval text-medieval-text font-bold text-lg">
                                                                {warrior.name}
                                                            </div>
                                                            <div className="font-medieval text-medieval-text-secondary text-xs flex gap-3">
                                                                <span>XP: {warrior.experience || 0}</span>
                                                                <span>W/L: {warrior.wins || 0}/{warrior.losses || 0}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        {showDeleteConfirm === String(warrior.id) ? (
                                                            // Delete confirmation UI
                                                            <div className="flex flex-col gap-2">
                                                                <div className="text-xs text-medieval-accent font-medieval text-center">
                                                                    DELETE?
                                                                </div>
                                                                <div className="flex gap-1">
                                                                    <MedievalButton
                                                                        variant="danger"
                                                                        className="text-xs px-2 py-1 flex-1"
                                                                        onClick={() => handleDeleteWarrior(String(warrior.id))}
                                                                        disabled={deletingWarriorId === String(warrior.id)}
                                                                    >
                                                                        {deletingWarriorId === String(warrior.id) ? '...' : 'YES'}
                                                                    </MedievalButton>
                                                                    <MedievalButton
                                                                        variant="secondary"
                                                                        className="text-xs px-2 py-1 flex-1"
                                                                        onClick={() => setShowDeleteConfirm(null)}
                                                                        disabled={deletingWarriorId === String(warrior.id)}
                                                                    >
                                                                        NO
                                                                    </MedievalButton>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            // Normal buttons
                                                            <>
                                                                <MedievalButton
                                                                    variant="secondary"
                                                                    className="text-xs px-3 py-1 flex items-center justify-center gap-2 w-24"
                                                                    onClick={() => handleWarriorSelect(warrior)}
                                                                >
                                                                    <User className="w-3 h-3" />
                                                                    DETAILS
                                                                </MedievalButton>
                                                                <MedievalButton
                                                                    variant="primary"
                                                                    className="text-xs px-3 py-1 flex items-center justify-center gap-2 w-24"
                                                                    onClick={() => onBattleStart(warrior)}
                                                                >
                                                                    <Sword className="w-3 h-3" />
                                                                    BATTLE
                                                                </MedievalButton>
                                                                <MedievalButton
                                                                    variant="danger"
                                                                    className="text-xs px-3 py-1 flex items-center justify-center gap-2 w-24"
                                                                    onClick={() => setShowDeleteConfirm(String(warrior.id))}
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                    DELETE
                                                                </MedievalButton>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Mini Stats Grid */}
                                                <div className="grid grid-cols-4 gap-2 text-center bg-medieval-bg/30 p-2 rounded border border-medieval-border/50">
                                                    <StatBox label="STR" value={warrior.strength} color="text-medieval-accent" />
                                                    <StatBox label="AGI" value={warrior.agility} color="text-green-700" />
                                                    <StatBox label="END" value={warrior.endurance} color="text-medieval-gold" />
                                                    <StatBox label="HP" value={100 + (warrior.endurance * 10)} color="text-red-600" />
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </MedievalPanel>
                        </div>
                    </motion.div>
                ) : (
                    <WarriorDetailView
                        warrior={selectedWarrior!}
                        onBack={handleBackToList}
                        onBattleStart={() => onBattleStart(selectedWarrior!)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div>
            <div className={`font-medieval ${color} font-bold text-lg`}>{value}</div>
            <div className="font-medieval text-medieval-text-secondary text-[10px]">{label}</div>
        </div>
    );
}

import { useAuth } from '@/contexts/AuthContext';

function WarriorDetailView({ warrior, onBack, onBattleStart }: { warrior: Warrior; onBack: () => void; onBattleStart: () => void }) {
    const { user } = useAuth(); // Added useAuth hook
    const [equipment, setEquipment] = useState<WarriorEquipment | null>(null);
    const [userInventory, setUserInventory] = useState<InventorySlot[]>([]);
    const [isLoadingInventory, setIsLoadingInventory] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

    useEffect(() => {
        const fetchInventoryData = async () => {
            if (!warrior.id || !user?.id) return; // Added user?.id check
            setIsLoadingInventory(true);
            try {
                // Fetch both warrior equipment and user inventory
                const [warriorEquip, userInv] = await Promise.all([
                    inventoryApi.getWarriorInventory(Number(warrior.id)),
                    inventoryApi.getUserInventory(user.id) // Use real user ID from AuthContext
                ]);
                setEquipment(warriorEquip);
                setUserInventory(userInv);
            } catch (error) {
                console.error('Failed to fetch inventory:', error);
            } finally {
                setIsLoadingInventory(false);
            }
        };

        fetchInventoryData();
    }, [warrior.id, user?.id]); // Added user?.id to dependency array

    const handleEquipItem = async (item: any, targetSlot: string) => {
        if (!warrior.id || !item || !user?.id) return; // Added user?.id check

        try {
            const result = await inventoryApi.equipItem({
                warriorId: Number(warrior.id),
                itemId: Number(item.id),
                slot: targetSlot.toUpperCase()
            });

            if (result.success) {
                // Refresh inventory
                const [warriorEquip, userInv] = await Promise.all([
                    inventoryApi.getWarriorInventory(Number(warrior.id)),
                    inventoryApi.getUserInventory(user.id) // Use real user ID from AuthContext
                ]);
                setEquipment(warriorEquip);
                setUserInventory(userInv);
                setSelectedSlot(null);
            } else {
                console.error('Failed to equip item:', result.message);
            }
        } catch (error) {
            console.error('Error equipping item:', error);
        }
    };

    const handleUnequipItem = async (slot: string) => {
        if (!warrior.id || !user?.id) return; // Added user?.id check

        try {
            const result = await inventoryApi.unequipItem({
                warriorId: Number(warrior.id),
                slot: slot.toUpperCase()
            });

            if (result.success) {
                // Refresh inventory
                const [warriorEquip, userInv] = await Promise.all([
                    inventoryApi.getWarriorInventory(Number(warrior.id)),
                    inventoryApi.getUserInventory(user.id) // Use real user ID from AuthContext
                ]);
                setEquipment(warriorEquip);
                setUserInventory(userInv);
            } else {
                console.error('Failed to unequip item:', result.message);
            }
        } catch (error) {
            console.error('Error unequipping item:', error);
        }
    };
    return (
        <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="h-full"
        >
            <div className="flex items-center justify-between mb-6">
                <MedievalButton variant="secondary" onClick={onBack} className="flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    BACK TO FORGE
                </MedievalButton>
                <MedievalButton variant="primary" onClick={onBattleStart} className="flex items-center gap-2 px-6">
                    <Sword className="w-4 h-4" />
                    ENTER BATTLE
                </MedievalButton>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Image & Core Info */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Avatar Card */}
                    <div className="aspect-[3/4] bg-[#d4c5a9] rounded-lg border-2 border-[#8b7355] p-4 relative shadow-inner flex flex-col">
                        <div className="flex-1 bg-[#cbb898] rounded border border-[#a68b6c] relative overflow-hidden flex items-end justify-center">
                            {/* Background texture/noise */}
                            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')]" />

                            {/* Warrior Image - Aligned to bottom */}
                            <img
                                src={warrior.image}
                                alt={warrior.name}
                                className="w-full h-auto object-contain max-h-[95%] drop-shadow-xl relative z-10"
                                style={{ imageRendering: 'pixelated' }}
                            />
                        </div>

                        <div className="mt-4 text-center">
                            <h2 className="font-medieval text-2xl text-[#2c1810] tracking-wide">{warrior.name}</h2>
                            <div className="flex justify-center gap-2 mt-1">
                                <span className="px-2 py-0.5 bg-[#e6dcc8] border border-[#a68b6c] text-[#5c4033] text-[10px] uppercase tracking-widest rounded-sm font-bold">
                                    Level {warrior.level}
                                </span>
                                <span className="px-2 py-0.5 bg-[#e6dcc8] border border-[#a68b6c] text-[#5c4033] text-[10px] uppercase tracking-widest rounded-sm font-bold">
                                    Warrior
                                </span>
                            </div>
                        </div>

                        {/* XP Bar */}
                        <div className="mt-4 px-2">
                            <div className="flex justify-between text-[10px] text-[#5c4033] font-bold tracking-widest mb-1 font-medieval">
                                <span>EXPERIENCE</span>
                                <span>{warrior.experience} / {warrior.nextLevelXp} XP</span>
                            </div>
                            <div className="h-2 bg-[#b09b7c] rounded-full border border-[#8b7355] overflow-hidden relative">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, (warrior.experience / warrior.nextLevelXp) * 100)}%` }}
                                    className="absolute top-0 left-0 h-full bg-[#5c4033]"
                                />
                                {/* Shine effect */}
                                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-3 gap-2 border-t border-[#a68b6c]/50 pt-4">
                            <div className="text-center border-r border-[#a68b6c]/50">
                                <Trophy className="w-4 h-4 text-[#8b7355] mx-auto mb-1" />
                                <div className="font-bold text-[#2c1810]">{warrior.wins || 0}</div>
                                <div className="text-[8px] text-[#5c4033] tracking-widest uppercase">Wins</div>
                            </div>
                            <div className="text-center border-r border-[#a68b6c]/50">
                                <Sword className="w-4 h-4 text-[#8b7355] mx-auto mb-1" />
                                <div className="font-bold text-[#2c1810]">{warrior.battlesFought || 0}</div>
                                <div className="text-[8px] text-[#5c4033] tracking-widest uppercase">Battles</div>
                            </div>
                            <div className="text-center">
                                <Skull className="w-4 h-4 text-[#8b7355] mx-auto mb-1" />
                                <div className="font-bold text-[#2c1810]">{warrior.losses || 0}</div>
                                <div className="text-[8px] text-[#5c4033] tracking-widest uppercase">Losses</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Middle Column: Stats */}
                <div className="lg:col-span-1">
                    <MedievalPanel title="ATTRIBUTES" className="h-full">
                        <div className="space-y-6 p-2">
                            <AttributeRow
                                icon={Sword}
                                label="STRENGTH"
                                value={warrior.strength}
                                color="text-medieval-accent"
                                description="Increases physical damage"
                            />
                            <AttributeRow
                                icon={Zap}
                                label="AGILITY"
                                value={warrior.agility}
                                color="text-green-700"
                                description="Increases critical chance and dodge"
                            />
                            <AttributeRow
                                icon={Heart}
                                label="ENDURANCE"
                                value={warrior.endurance}
                                color="text-medieval-gold"
                                description="Increases health and stamina"
                            />
                            <AttributeRow
                                icon={Brain}
                                label="INTELLIGENCE"
                                value={warrior.intelligence}
                                color="text-blue-700"
                                description="Increases magic power and mana"
                            />
                            <AttributeRow
                                icon={Heart}
                                label="HEALTH"
                                value={100 + (warrior.endurance * 10)}
                                color="text-red-600"
                                description="Total Hit Points"
                                isHealth={true}
                            />
                        </div>
                    </MedievalPanel>
                </div>

                {/* Right Column: Equipment & Inventory */}
                <div className="lg:col-span-1">
                    <MedievalPanel title="EQUIPMENT & INVENTORY" className="h-full">
                        {isLoadingInventory ? (
                            <div className="flex items-center justify-center py-12">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    className="w-8 h-8 border-4 border-medieval-gold border-t-transparent rounded-full"
                                />
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Equipment Slots Section */}
                                <div>
                                    <div className="text-xs font-medieval text-medieval-text-secondary mb-3 tracking-widest border-b border-medieval-border/30 pb-2">
                                        EQUIPPED GEAR (13 SLOTS)
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            // Row 1
                                            { key: 'head', label: 'HEAD', icon: User },
                                            { key: 'neck', label: 'NECK', icon: Zap },
                                            { key: 'shoulders', label: 'SHOULDERS', icon: Shield },
                                            // Row 2
                                            { key: 'back', label: 'CLOAK', icon: Shield },
                                            { key: 'chest', label: 'CHEST', icon: Shield },
                                            { key: 'wrist', label: 'BRACERS', icon: User },
                                            // Row 3
                                            { key: 'tool', label: 'WEAPON', icon: Sword },
                                            { key: 'waist', label: 'BELT', icon: User },
                                            { key: 'offhand', label: 'OFFHAND', icon: Shield },
                                            // Row 4
                                            { key: 'hand', label: 'GLOVES', icon: User },
                                            { key: 'legs', label: 'LEGS', icon: User },
                                            { key: 'feet', label: 'BOOTS', icon: User },
                                            // Row 5 (span middle column)
                                            { key: 'finger', label: 'RING', icon: Zap },
                                        ].map(({ key, label, icon: Icon }) => {
                                            const equippedItem = equipment?.slots?.find(s => s.type === key)?.item;
                                            const isSelected = selectedSlot === key;

                                            return (
                                                <div key={key} className={`flex flex-col items-center gap-1 ${key === 'finger' ? 'col-start-2' : ''}`}>
                                                    <div
                                                        className={`aspect-square relative cursor-pointer group w-full ${isSelected ? 'ring-2 ring-medieval-gold' : ''
                                                            }`}
                                                        onClick={() => {
                                                            if (equippedItem) {
                                                                handleUnequipItem(key);
                                                            } else {
                                                                setSelectedSlot(key);
                                                            }
                                                        }}
                                                    >
                                                        <img
                                                            src={ASSETS.SLOT}
                                                            className="absolute inset-0 w-full h-full object-contain opacity-80"
                                                            style={{ imageRendering: 'pixelated' }}
                                                            alt="slot"
                                                        />

                                                        <div className="absolute inset-0 flex items-center justify-center p-1.5 z-10">
                                                            {equippedItem ? (
                                                                <div className="relative w-full h-full flex items-center justify-center">
                                                                    <ItemIcon item={equippedItem} size="sm" />
                                                                </div>
                                                            ) : (
                                                                <Icon className="w-4 h-4 text-[#8d6e63] opacity-40 group-hover:opacity-70 transition-opacity" />
                                                            )}
                                                        </div>

                                                        {isSelected && (
                                                            <div className="absolute -inset-1 opacity-100 pointer-events-none z-20">
                                                                <img
                                                                    src={ASSETS.CURSOR}
                                                                    className="w-full h-full object-contain drop-shadow-md"
                                                                    style={{ imageRendering: 'pixelated' }}
                                                                    alt="selected"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="text-[8px] text-[#5c4033] font-medieval tracking-wider">
                                                        {label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* User Inventory Section */}
                                <div>
                                    <div className="text-xs font-medieval text-medieval-text-secondary mb-3 tracking-widest border-b border-medieval-border/30 pb-2">
                                        YOUR INVENTORY
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                                        {userInventory.length === 0 ? (
                                            <div className="col-span-4 text-center py-6 text-[#8d6e63] text-xs font-medieval">
                                                No items in inventory
                                            </div>
                                        ) : (
                                            userInventory.map((slot) => (
                                                <div
                                                    key={slot.id}
                                                    className="aspect-square relative cursor-pointer group"
                                                    onClick={() => {
                                                        if (selectedSlot && slot.item) {
                                                            handleEquipItem(slot.item, selectedSlot);
                                                        }
                                                    }}
                                                >
                                                    <img
                                                        src={ASSETS.SLOT}
                                                        className="absolute inset-0 w-full h-full object-contain opacity-80"
                                                        style={{ imageRendering: 'pixelated' }}
                                                        alt="slot"
                                                    />

                                                    {slot.item && (
                                                        <div className="absolute inset-0 flex items-center justify-center p-1.5 z-10">
                                                            <ItemIcon item={slot.item} size="sm" />
                                                            {slot.quantity > 1 && (
                                                                <div className="absolute bottom-0.5 right-0.5 bg-[#2a1b15] text-[#f3e5d0] text-[8px] px-1 rounded border border-[#5d4037]">
                                                                    {slot.quantity}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="absolute -inset-0.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                                                        <img
                                                            src={ASSETS.CURSOR}
                                                            className="w-full h-full object-contain drop-shadow-md"
                                                            style={{ imageRendering: 'pixelated' }}
                                                            alt="hover"
                                                        />
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {selectedSlot && (
                                    <div className="text-xs text-center text-[#8d6e63] italic font-medieval border-t border-medieval-border/30 pt-3">
                                        Select an item from inventory to equip to {selectedSlot.toUpperCase()}
                                    </div>
                                )}
                            </div>
                        )}
                    </MedievalPanel>
                </div>
            </div>
        </motion.div>
    );
}

function AttributeRow({ icon: Icon, label, value, color, description, isHealth }: { icon: any, label: string, value: number, color: string, description: string, isHealth?: boolean }) {
    return (
        <div className="bg-medieval-bg/30 p-4 rounded border border-medieval-border/30">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded bg-black/20 ${color}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="font-medieval text-medieval-text">{label}</div>
                        <div className="text-[10px] text-medieval-text-secondary font-serif-vintage">{description}</div>
                    </div>
                </div>
                <div className={`font-medieval text-2xl font-bold ${color}`}>{value}</div>
            </div>
            <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                <div
                    className={`h-full ${color.replace('text-', 'bg-')}`}
                    style={{ width: `${isHealth ? Math.min(100, (value / 500) * 100) : (value / 20) * 100}%` }}
                />
            </div>
        </div>
    );
}

// Warrior Creation Form Component (Copied and adapted from GameScene)
function WarriorCreationForm({ onWarriorCreated }: { onWarriorCreated: () => void }) {
    const { createWarrior } = useGameStore();
    const [warriorName, setWarriorName] = useState('');
    const [stats, setStats] = useState({
        strength: 5,
        agility: 5,
        endurance: 5,
        intelligence: 5,
    });
    const [isCreating, setIsCreating] = useState(false);

    const totalPoints = Object.values(stats).reduce((sum, value) => sum + value, 0);
    const maxPoints = 20;

    const updateStat = (statName: keyof typeof stats, value: number) => {
        const newStats = { ...stats, [statName]: value };
        const newTotal = Object.values(newStats).reduce((sum, val) => sum + val, 0);

        if (newTotal <= maxPoints) {
            setStats(newStats);
        }
    };

    const generateName = () => {
        const newName = generateWarriorName();
        setWarriorName(newName);
    };

    const handleCreate = async () => {
        if (!warriorName.trim() || totalPoints !== maxPoints) return;

        setIsCreating(true);

        try {
            // Determine archetype (Simplified for brevity, can be expanded)
            const archetypes = [
                { name: "strength-dominant", check: (s: typeof stats) => s.strength >= 7 },
                { name: "agility-dominant", check: (s: typeof stats) => s.agility >= 7 },
                { name: "intelligence-dominant", check: (s: typeof stats) => s.intelligence >= 7 },
                { name: "endurance-dominant", check: (s: typeof stats) => s.endurance >= 7 },
                { name: "balanced", check: () => true },
            ];

            let archetypeName = "balanced";
            for (const archetype of archetypes) {
                if (archetype.check(stats)) {
                    archetypeName = archetype.name;
                    break;
                }
            }

            await createWarrior({
                name: warriorName.trim(),
                image: `/assets/archetypes/${archetypeName}.png`,
                stats: stats
            });

            onWarriorCreated();
            setWarriorName('');
            setStats({ strength: 5, agility: 5, endurance: 5, intelligence: 5 });
        } catch (error) {
            console.error('Failed to create warrior:', error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Warrior Name Input */}
            <div>
                <label className="block font-medieval text-medieval-text-secondary mb-2 text-sm">
                    WARRIOR NAME
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={warriorName}
                        onChange={(e) => setWarriorName(e.target.value)}
                        placeholder="Enter warrior name..."
                        className="flex-1 bg-medieval-bg border border-medieval-border text-medieval-text px-4 py-2 rounded focus:outline-none focus:border-medieval-gold font-medieval placeholder:text-medieval-text-secondary/50"
                        maxLength={50}
                    />
                    <MedievalButton
                        variant="secondary"
                        onClick={generateName}
                        className="px-3"
                        title="Generate random name"
                    >
                        <Shuffle className="w-4 h-4" />
                    </MedievalButton>
                </div>
            </div>

            {/* Stats Allocation */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <label className="font-medieval text-medieval-text-secondary text-sm">
                        POINTS: {totalPoints}/{maxPoints}
                    </label>
                </div>

                <div className="space-y-4">
                    {[
                        { key: 'strength' as const, label: 'STRENGTH', icon: Sword, color: 'text-medieval-accent' },
                        { key: 'agility' as const, label: 'AGILITY', icon: Zap, color: 'text-green-700' },
                        { key: 'endurance' as const, label: 'ENDURANCE', icon: Heart, color: 'text-medieval-gold' },
                        { key: 'intelligence' as const, label: 'INTELLIGENCE', icon: Brain, color: 'text-blue-700' },
                    ].map(({ key, label, icon: Icon, color }) => (
                        <div key={key} className="bg-medieval-bg/30 p-3 rounded border border-medieval-border/30">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Icon className={`w-4 h-4 ${color}`} />
                                    <span className="font-medieval text-medieval-text text-sm">{label}</span>
                                </div>
                                <span className={`${color} font-medieval font-bold text-lg`}>
                                    {stats[key]}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <MedievalButton
                                    variant="secondary"
                                    onClick={() => updateStat(key, Math.max(1, stats[key] - 1))}
                                    disabled={stats[key] <= 1}
                                    className="w-8 h-8 p-0 flex items-center justify-center text-sm"
                                >
                                    -
                                </MedievalButton>

                                <div className="flex-1 h-2 bg-medieval-bg rounded-full overflow-hidden border border-medieval-border/50">
                                    <div
                                        className={`h-full ${key === 'strength' ? 'bg-medieval-accent' : key === 'agility' ? 'bg-green-700' : key === 'endurance' ? 'bg-medieval-gold' : 'bg-blue-700'}`}
                                        style={{ width: `${(stats[key] / 10) * 100}%` }}
                                    />
                                </div>

                                <MedievalButton
                                    variant="secondary"
                                    onClick={() => updateStat(key, Math.min(10, stats[key] + 1))}
                                    disabled={stats[key] >= 10 || totalPoints >= maxPoints}
                                    className="w-8 h-8 p-0 flex items-center justify-center text-sm"
                                >
                                    +
                                </MedievalButton>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Create Button */}
            <MedievalButton
                variant="gold"
                fullWidth
                onClick={handleCreate}
                disabled={!warriorName.trim() || totalPoints !== maxPoints || isCreating}
                className="py-3 font-medieval font-bold text-lg mt-4"
            >
                {isCreating ? 'CREATING...' : 'CREATE WARRIOR'}
            </MedievalButton>
        </div>
    );
}
