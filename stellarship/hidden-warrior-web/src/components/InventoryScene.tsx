'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/services/NotificationService';
import { MedievalButton } from './ui/MedievalButton';
import { Shield, Sword, Backpack, User, ArrowLeft, Scroll, Info } from 'lucide-react';
import { Item, InventorySlot } from '@/types/inventory';
import { inventoryApi } from '@/lib/apiClient';

// Asset Paths
const SPRITE_PATH = '/assets/ui/Sprites';
const POTION_PATH = '/assets/ui/icons/Potions_Icons';
const ITEMS_SPRITESHEET = '/assets/ui/Spritesheet/items.png';

const ASSETS = {
    BOOK_PAGE_LEFT: `${SPRITE_PATH}/UI_TravelBook_BookPageLeft01a.png`,
    BOOK_PAGE_RIGHT: `${SPRITE_PATH}/UI_TravelBook_BookPageRight01a.png`,
    SLOT: `${SPRITE_PATH}/UI_TravelBook_Slot01a.png`,
    SLOT_SELECTED: `${SPRITE_PATH}/UI_TravelBook_Slot01b.png`,
    CURSOR: `${SPRITE_PATH}/UI_TravelBook_Select01a.png`,
    SEPARATOR: `${SPRITE_PATH}/UI_TravelBook_Line01a.png`,
};

// Mock Data
// Assuming 16x16 grid.
// Sword: Row 0, Col 4
// Armor: Row 1, Col 12 (Leather look)
// Shield: Row 1, Col 11 (Round shield)
// Scroll: Row 0, Col 3
const MOCK_ITEMS: (Item & { spriteCoords?: { x: number, y: number } })[] = [
    { id: '1', name: 'Rusty Sword', type: 'weapon', rarity: 'common', description: 'A blade that has seen better days. The edge is chipped and the handle is worn.', stats: { attack: 5 }, icon: 'sword', spriteCoords: { x: 4, y: 0 } },
    { id: '2', name: 'Leather Tunic', type: 'armor', rarity: 'common', description: 'Simple protective gear made from cured animal hide. Offers basic protection.', stats: { defense: 3 }, icon: 'armor', spriteCoords: { x: 12, y: 1 } },
    { id: '3', name: 'Health Potion', type: 'consumable', rarity: 'common', description: 'A small vial of red liquid. Smells like strawberries and iron.', stats: { health: 50 }, icon: `${POTION_PATH}/Potion_healing_icon_160x160.png` },
    { id: '4', name: 'Iron Shield', type: 'armor', rarity: 'uncommon', description: 'A heavy shield forged from iron. Can withstand heavy blows.', stats: { defense: 8 }, icon: 'shield', spriteCoords: { x: 11, y: 1 } },
    { id: '5', name: 'Magic Scroll', type: 'consumable', rarity: 'rare', description: 'Ancient parchment containing a single use spell of unknown power.', icon: 'scroll', spriteCoords: { x: 3, y: 0 } },
    { id: '6', name: 'Mana Potion', type: 'consumable', rarity: 'uncommon', description: 'Restores magical energy. Tastes like blueberries.', stats: { mana: 30 }, icon: `${POTION_PATH}/Potion_mana_icon_160x160.png` },
    { id: '7', name: 'Stamina Potion', type: 'consumable', rarity: 'common', description: 'Invigorating brew. Keeps you going.', stats: { stamina: 20 }, icon: `${POTION_PATH}/Potion_stamina_icon_160x160.png` },
];

const INITIAL_INVENTORY: InventorySlot[] = [
    { id: 's1', item: MOCK_ITEMS[0], quantity: 1 },
    { id: 's2', item: MOCK_ITEMS[1], quantity: 1 },
    { id: 's3', item: MOCK_ITEMS[2], quantity: 5 },
    { id: 's4', item: MOCK_ITEMS[3], quantity: 1 },
    { id: 's5', item: MOCK_ITEMS[4], quantity: 2 },
    { id: 's6', item: MOCK_ITEMS[5], quantity: 3 },
    { id: 's7', item: MOCK_ITEMS[6], quantity: 1 },
    ...Array(18).fill({ id: 'empty', item: null, quantity: 0 }).map((_, i) => ({ id: `e${i}`, item: null, quantity: 0 }))
];

export default function InventoryScene() {
    const { setScene, warriors, fetchWarriors } = useGameStore();
    const { user } = useAuth();
    const { showNotification, showConfirm } = useNotification();
    const [activeTab, setActiveTab] = useState<string>('global');
    const [selectedItem, setSelectedItem] = useState<InventorySlot | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [inventoryItems, setInventoryItems] = useState<InventorySlot[]>([]);
    const [draggedSlotId, setDraggedSlotId] = useState<string | null>(null);

    // Load user inventory from API
    useEffect(() => {
        const loadInventory = async () => {
            if (!user?.id) return;

            setIsLoading(true);
            try {
                const items = await inventoryApi.getUserInventory(user.id);
                console.log('[InventoryScene] Loaded items from API:', items);
                setInventoryItems(items);
            } catch (error) {
                console.error('[InventoryScene] Failed to load inventory:', error);
                // Fallback to mock data on error
                setInventoryItems(INITIAL_INVENTORY);
            } finally {
                setIsLoading(false);
            }
        };

        loadInventory();
    }, [user?.id]);

    // Fetch warriors if missing
    useEffect(() => {
        if (warriors.length === 0) {
            const loadData = async () => {
                await fetchWarriors();
            };
            loadData();
        }
    }, [warriors.length, fetchWarriors]);

    const activeWarrior = activeTab !== 'global' ? warriors.find(w => w.id === activeTab) : null;

    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent, slotId: string) => {
        setDraggedSlotId(slotId);
        e.dataTransfer.effectAllowed = 'move';
        // Optional: Set a custom drag image if needed
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetSlotId: string) => {
        e.preventDefault();
        if (!draggedSlotId || draggedSlotId === targetSlotId) return;

        const newItems = [...inventoryItems];
        const draggedIndex = newItems.findIndex(slot => slot.id === draggedSlotId);
        const targetIndex = newItems.findIndex(slot => slot.id === targetSlotId);

        if (draggedIndex === -1 || targetIndex === -1) return;

        // Swap items
        const temp = newItems[draggedIndex];
        newItems[draggedIndex] = { ...newItems[targetIndex], id: temp.id }; // Keep original ID for the slot position? Or swap fully?
        // Actually, usually slots are fixed positions. Let's just swap the objects in the array for now.
        newItems[draggedIndex] = newItems[targetIndex];
        newItems[targetIndex] = temp;

        setInventoryItems(newItems);
        setDraggedSlotId(null);
    };


    const handleDestroyItem = async () => {
        if (!selectedItem?.item || !user?.id) return;

        const confirmed = await showConfirm({
            title: 'DESTROY ITEM',
            message: `Are you sure you want to destroy ${selectedItem.item.name}? This action cannot be undone.`,
            confirmText: 'DESTROY',
            cancelText: 'CANCEL',
            type: 'error'
        });

        if (!confirmed) return;

        setIsLoading(true);
        try {
            const result = await inventoryApi.trashItem({
                inventoryType: 'user',
                ownerId: user.id,
                itemId: Number(selectedItem.item.id),
                quantity: selectedItem.quantity
            });

            if (result.success) {
                // Refresh inventory
                const items = await inventoryApi.getUserInventory(user.id);
                setInventoryItems(items);
                setSelectedItem(null);

                showNotification({
                    type: 'success',
                    title: 'ITEM DESTROYED',
                    message: `${selectedItem.item.name} has been destroyed.`
                });
            } else {
                showNotification({
                    type: 'error',
                    title: 'DESTRUCTION FAILED',
                    message: result.message || 'Failed to destroy item'
                });
            }
        } catch (error) {
            console.error('[InventoryScene] Failed to destroy item:', error);
            showNotification({
                type: 'error',
                title: 'ERROR',
                message: 'An unexpected error occurred while destroying the item.'
            });
        } finally {
            setIsLoading(false);
        }
    };


    const pageFlipVariants = {
        initial: { rotateY: 90, opacity: 0, transformOrigin: "left center" },
        animate: { rotateY: 0, opacity: 1, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
        exit: { rotateY: -90, opacity: 0, transition: { duration: 0.3, ease: [0.4, 0, 1, 1] } }
    };

    return (
        <div className="min-h-screen bg-[#1a1412] flex items-center justify-center p-4 md:p-8 overflow-hidden relative font-medieval perspective-[2000px]">
            {/* Background Texture */}
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] pointer-events-none" />

            {/* Back Button */}
            <div className="absolute top-8 left-8 z-50">
                <MedievalButton
                    onClick={() => setScene('menu')}
                    variant="secondary"
                    className="flex items-center gap-2"
                >
                    <ArrowLeft size={16} />
                    BACK TO MENU
                </MedievalButton>
            </div>

            {/* Book Container */}
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative flex w-full max-w-6xl aspect-[16/10] z-10 drop-shadow-2xl"
            >
                {/* Tabs (Left Side) - Positioned absolutely */}
                <div className="absolute left-0 top-12 bottom-12 w-48 -translate-x-[92%] z-20 flex flex-col gap-4 py-8 pointer-events-none">
                    <div className="pointer-events-auto flex flex-col gap-4 w-full h-full overflow-y-auto pr-4 no-scrollbar pl-4">
                        <TabButton
                            active={activeTab === 'global'}
                            onClick={() => setActiveTab('global')}
                            label="GLOBAL"
                            icon={<Backpack size={20} />}
                        />

                        <div className="h-px bg-[#5d4037]/50 mx-2 my-2" />

                        {isLoading ? (
                            <div className="text-[#8d6e63] text-xs text-center animate-pulse font-medieval">Loading...</div>
                        ) : (
                            warriors.map((warrior) => (
                                <TabButton
                                    key={warrior.id}
                                    active={activeTab === warrior.id}
                                    onClick={() => setActiveTab(warrior.id)}
                                    label={warrior.name.split(' ')[0].toUpperCase()}
                                    icon={<User size={20} />}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* The Book Itself - Using Sprites */}
                <div className="flex-1 flex relative">
                    {/* Left Page Sprite */}
                    <div
                        className="flex-1 relative bg-no-repeat bg-fill"
                        style={{
                            backgroundImage: `url(${ASSETS.BOOK_PAGE_LEFT})`,
                            backgroundSize: '100% 100%',
                            imageRendering: 'pixelated'
                        }}
                    >
                        {/* Content Container Left */}
                        <div className="absolute inset-0 p-12 pl-16 flex flex-col">
                            {/* Header */}
                            <div className="mb-6 flex items-end justify-between border-b-2 border-[#3e2723]/20 pb-2">
                                <h2 className="text-3xl text-[#3e2723] tracking-widest font-medieval">
                                    {activeTab === 'global' ? 'INVENTORY' : `${activeWarrior?.name}'S GEAR`}
                                </h2>
                                <span className="font-medieval text-xs text-[#5d4037] font-bold">
                                    SLOTS: {inventoryItems.filter(s => s.item).length}/{inventoryItems.length}
                                </span>
                            </div>

                            {/* Equipment Slots (Warrior Only) */}
                            {activeWarrior && (
                                <div className="mb-6 p-4 border border-[#5d4037]/30 bg-[#eefebe]/10 rounded relative">
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#f3e5d0] px-2 text-xs text-[#5d4037] font-bold tracking-widest border border-[#5d4037]/30 rounded-sm font-medieval">
                                        EQUIPPED
                                    </div>
                                    <div className="flex justify-center gap-6 pt-2">
                                        <EquipSlot label="HEAD" icon={<User size={18} />} />
                                        <EquipSlot label="BODY" icon={<Shield size={18} />} />
                                        <EquipSlot label="MAIN" icon={<Sword size={18} />} />
                                        <EquipSlot label="OFF" icon={<Shield size={18} />} />
                                    </div>
                                </div>
                            )}

                            {/* Grid */}
                            <div className="grid grid-cols-5 gap-3 overflow-y-auto custom-scrollbar pr-2 p-2 -m-2">
                                <AnimatePresence mode="wait" initial={false}>
                                    <motion.div
                                        key={activeTab}
                                        variants={pageFlipVariants}
                                        initial="initial"
                                        animate="animate"
                                        exit="exit"
                                        className="contents"
                                    >
                                        {inventoryItems.map((slot, idx) => (
                                            <ItemSlot
                                                key={slot.id || `slot-${idx}`}
                                                slot={slot}
                                                isSelected={selectedItem?.item?.id === slot.item?.id && !!slot.item}
                                                onClick={() => setSelectedItem(slot)}
                                                onDragStart={(e: React.DragEvent) => handleDragStart(e, slot.id || `slot-${idx}`)}
                                                onDragOver={handleDragOver}
                                                onDrop={(e: React.DragEvent) => handleDrop(e, slot.id || `slot-${idx}`)}
                                            />
                                        ))}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>

                    {/* Right Page Sprite */}
                    <div
                        className="flex-1 relative bg-no-repeat bg-fill"
                        style={{
                            backgroundImage: `url(${ASSETS.BOOK_PAGE_RIGHT})`,
                            backgroundSize: '100% 100%',
                            imageRendering: 'pixelated'
                        }}
                    >
                        {/* Content Container Right */}
                        <div className="absolute inset-0 p-12 pr-16 flex flex-col">
                            <AnimatePresence mode="wait">
                                {selectedItem ? (
                                    <motion.div
                                        key={selectedItem.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="h-full flex flex-col px-8 py-4 relative z-10"
                                    >
                                        {/* Item Header */}
                                        <div className="flex items-center gap-4 mb-6 border-b border-[#3e2723]/30 pb-4">
                                            <div className="w-16 h-16 flex items-center justify-center relative">
                                                <img src={ASSETS.SLOT} className="absolute inset-0 w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} />
                                                <div className="relative z-10 flex items-center justify-center w-full h-full p-2">
                                                    <ItemIcon item={selectedItem.item} size="lg" />
                                                </div>
                                            </div>
                                            <div>
                                                <h3 className="text-2xl text-[#3e2723] leading-none font-medieval">{selectedItem.item?.name}</h3>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="w-2 h-2 rotate-45 bg-[#3e2723]" />
                                                    <span className="text-xs uppercase tracking-widest text-[#5d4037] font-bold font-medieval">
                                                        {selectedItem.item?.rarity} {selectedItem.item?.type}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Description Panel */}
                                        <div className="flex-1 relative mb-6 bg-[#4a5462] rounded border-2 border-[#2a2f38] shadow-inner p-4 flex items-center">
                                            <div className="text-[#e2e8f0] italic leading-relaxed text-lg text-center w-full font-medieval tracking-wide">
                                                "{selectedItem.item?.description}"
                                            </div>
                                        </div>

                                        {/* Stats */}
                                        {selectedItem.item?.stats && (
                                            <div className="mb-8 space-y-2 bg-[#3e2723]/5 p-4 rounded border border-[#3e2723]/20">
                                                {Object.entries(selectedItem.item.stats).map(([key, val]) => (
                                                    <div key={key} className="flex items-center justify-between border-b border-dotted border-[#3e2723]/40 pb-1 last:border-0">
                                                        <span className="text-[#5d4037] capitalize text-sm tracking-wide font-medieval">{key}</span>
                                                        <span className="font-mono font-bold text-[#3e2723]">+{val}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex flex-col gap-3 mt-auto">
                                            <MedievalButton variant="primary" fullWidth>
                                                {activeTab === 'global' ? 'TRANSFER ITEM' : 'EQUIP ITEM'}
                                            </MedievalButton>
                                            <MedievalButton
                                                variant="danger"
                                                fullWidth
                                                onClick={handleDestroyItem}
                                                disabled={isLoading}
                                            >
                                                {isLoading ? 'DESTROYING...' : 'DESTROY ITEM'}
                                            </MedievalButton>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="h-full flex flex-col items-center justify-center text-[#5d4037]/50 relative z-10"
                                    >
                                        <div className="w-24 h-24 border-4 border-double border-[#5d4037]/30 rounded-full flex items-center justify-center mb-4 animate-pulse">
                                            <Info size={48} />
                                        </div>
                                        <p className="text-xl tracking-widest font-medieval">SELECT AN ITEM</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// Components

function SpriteIcon({ x, y, size = 'md' }: { x: number, y: number, size?: 'sm' | 'md' | 'lg' }) {
    // Assuming 16x16 sprites in the sheet
    const spriteSize = 16;
    const scale = size === 'lg' ? 4 : size === 'md' ? 2.5 : 1.5; // Scale factor for display

    return (
        <div
            style={{
                width: `${spriteSize}px`,
                height: `${spriteSize}px`,
                backgroundImage: `url(${ITEMS_SPRITESHEET})`,
                backgroundPosition: `-${x * spriteSize}px -${y * spriteSize}px`,
                imageRendering: 'pixelated',
                transform: `scale(${scale})`,
                transformOrigin: 'center',
            }}
        />
    );
}

function ItemIcon({ item, size = 'md' }: { item: any, size?: 'sm' | 'md' | 'lg' }) {
    if (!item) return null;

    // Import sprite coords helper
    const getCoords = () => {
        if (item.iconCoords || item.spriteCoords) {
            return item.iconCoords || item.spriteCoords;
        }

        // Map backend uppercase slot to frontend lowercase
        const slot = item.slot?.toLowerCase();

        // Equipment sprite coords by slot
        const equipmentCoords: Record<string, { x: number, y: number }> = {
            tool: { x: 4, y: 0 },
            offhand: { x: 11, y: 1 },
            head: { x: 13, y: 1 },
            chest: { x: 12, y: 1 },
            shoulders: { x: 12, y: 1 },
            legs: { x: 12, y: 1 },
            feet: { x: 12, y: 1 },
            hand: { x: 12, y: 1 },
            back: { x: 12, y: 1 },
            neck: { x: 1, y: 2 },
            finger: { x: 0, y: 2 },
            waist: { x: 0, y: 2 },
            wrist: { x: 0, y: 2 },
        };

        if (item.category === 'equipment' && slot && equipmentCoords[slot]) {
            return equipmentCoords[slot];
        }

        // Category fallbacks
        const categoryCoords: Record<string, { x: number, y: number }> = {
            consumable: { x: 0, y: 3 },
            material: { x: 2, y: 3 },
            quest: { x: 3, y: 0 },
        };

        if (item.category && categoryCoords[item.category]) {
            return categoryCoords[item.category];
        }

        return { x: 0, y: 0 };
    };

    const coords = getCoords();
    const spriteSize = 16;
    const scale = size === 'lg' ? 4 : size === 'md' ? 2.5 : 1.5;

    return (
        <div
            className="flex-shrink-0"
            style={{
                width: `${spriteSize}px`,
                height: `${spriteSize}px`,
                backgroundImage: `url(${ITEMS_SPRITESHEET})`,
                backgroundPosition: `-${coords.x * spriteSize}px -${coords.y * spriteSize}px`,
                imageRendering: 'pixelated',
                transform: `scale(${scale})`,
                transformOrigin: 'center',
            }}
        />
    );
}

function TabButton({ active, onClick, label, icon }: any) {
    return (
        <button
            onClick={onClick}
            className={`
        flex items-center gap-3 px-4 py-3 transition-all duration-200
        relative group font-medieval tracking-widest text-sm w-full
        ${active
                    ? 'translate-x-2 z-30'
                    : 'hover:translate-x-1'
                }
      `}
        >
            {/* Tab Background Shape */}
            <div className={`
        absolute inset-0 border-2 shadow-md transition-colors duration-200
        ${active
                    ? 'bg-[#f3e5d0] border-[#3e2723] border-r-0' // Active: Matches page color
                    : 'bg-[#2a1b15] border-[#5d4037]' // Inactive: Dark leather
                }
      `}
                style={{
                    clipPath: 'polygon(0 0, 100% 5%, 100% 95%, 0 100%)'
                }}
            />

            {/* Connector to Book (Active Only) */}
            {active && (
                <div className="absolute right-[-2px] top-0 bottom-0 w-4 bg-[#f3e5d0] z-40" />
            )}

            {/* Icon Box */}
            <div className={`
        relative z-10 w-8 h-8 flex items-center justify-center rounded-sm border transition-colors duration-200
        ${active
                    ? 'bg-[#3e2723] border-[#5d4037] text-[#f3e5d0]'
                    : 'bg-[#3e2723]/50 border-[#5d4037]/50 text-[#8d6e63]'
                }
      `}>
                {icon}
            </div>

            {/* Label */}
            <span className={`
        relative z-10 font-bold transition-colors duration-200 truncate
        ${active ? 'text-[#3e2723]' : 'text-[#8d6e63]'}
      `}>
                {label}
            </span>
        </button>
    );
}

function ItemSlot({ slot, isSelected, onClick, onDragStart, onDragOver, onDrop }: any) {
    const hasItem = !!slot.item;

    return (
        <div
            onClick={onClick}
            draggable={hasItem}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            className="aspect-square relative cursor-pointer transition-all duration-200 group"
        >
            {/* Slot Background Sprite */}
            <img
                src={ASSETS.SLOT}
                className="absolute inset-0 w-full h-full object-contain opacity-80"
                style={{ imageRendering: 'pixelated' }}
                alt="slot"
            />

            {/* Item Content */}
            {hasItem && (
                <div className="absolute inset-0 flex items-center justify-center p-2 z-10 overflow-hidden">
                    <ItemIcon item={slot.item} size="md" />

                    {slot.quantity > 1 && (
                        <div className="absolute bottom-1 right-1 bg-[#2a1b15] text-[#f3e5d0] text-[10px] px-1 font-mono border border-[#5d4037] rounded shadow-sm z-20">
                            {slot.quantity}
                        </div>
                    )}
                </div>
            )}

            {/* Cursor Effect - shows ONLY when selected OR on hover */}
            {hasItem && (
                <div
                    className={`absolute -inset-0.5 transition-opacity pointer-events-none z-20 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                >
                    <img
                        src={ASSETS.CURSOR}
                        className="w-full h-full object-contain drop-shadow-md"
                        style={{ imageRendering: 'pixelated' }}
                        alt="cursor"
                    />
                </div>
            )}
        </div>
    );
}

function EquipSlot({ label, icon }: any) {
    return (
        <div className="flex flex-col items-center gap-2 group cursor-pointer relative">
            <div className="w-12 h-12 relative flex items-center justify-center text-[#8d6e63] transition-all duration-300 group-hover:text-[#d7ccc8]">
                <img
                    src={ASSETS.SLOT}
                    className="absolute inset-0 w-full h-full object-contain opacity-80"
                    style={{ imageRendering: 'pixelated' }}
                    alt="slot"
                />
                <div className="relative z-10">
                    {icon}
                </div>
            </div>
            <span className="text-[10px] text-[#5d4037] font-bold uppercase tracking-widest group-hover:text-[#3e2723] transition-colors font-medieval">{label}</span>
        </div>
    );
}
