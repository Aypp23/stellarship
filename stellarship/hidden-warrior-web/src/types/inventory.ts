// ==========================================
// ITEM CATEGORIES
// ==========================================

export type ItemCategory = 'equipment' | 'consumable' | 'material' | 'quest';

// ==========================================
// ITEM SLOTS (13 equipment slots)
// ==========================================

export type ItemSlotType =
    | 'head'       // Шлем
    | 'tool'       // Основное оружие
    | 'offhand'    // Щит/второе оружие
    | 'back'       // Плащ
    | 'hand'       // Перчатки
    | 'finger'     // Кольцо
    | 'feet'       // Ботинки
    | 'legs'       // Штаны
    | 'neck'       // Ожерелье
    | 'shoulders'  // Наплечники
    | 'waist'      // Пояс
    | 'wrist'      // Браслет
    | 'chest';     // Нагрудник

export const ALL_EQUIPMENT_SLOTS: ItemSlotType[] = [
    'head', 'tool', 'offhand', 'back',
    'hand', 'finger', 'feet', 'legs',
    'neck', 'shoulders', 'waist', 'wrist', 'chest'
];

// Маппинг для отображения
export const SLOT_DISPLAY_NAMES: Record<ItemSlotType, string> = {
    head: 'HEAD',
    tool: 'WEAPON',
    offhand: 'OFFHAND',
    back: 'CLOAK',
    hand: 'GLOVES',
    finger: 'RING',
    feet: 'BOOTS',
    legs: 'LEGS',
    neck: 'NECKLACE',
    shoulders: 'SHOULDERS',
    waist: 'BELT',
    wrist: 'BRACERS',
    chest: 'CHEST',
};

// ==========================================
// PROP (AFFIX) TYPES
// ==========================================

export interface Prop {
    name: string;           // Название аффикса или "-" для пустого
    weight: number | string; // Может быть string
}

// ==========================================
// BASE ITEM INTERFACE
// ==========================================

interface BaseItem {
    id: string;
    name: string;
    category: ItemCategory;
    iconCoords?: {
        x: number;
        y: number;
    };
    description?: string;
    stackable: boolean;
    maxStack: number;
    tradeable: boolean;
    createdAt?: string;
    updatedAt?: string;
}

// ==========================================
// EQUIPMENT ITEM (для воинов)
// ==========================================

export interface EquipmentItem extends BaseItem {
    category: 'equipment';
    slot: ItemSlotType;
    slotIndex: number;

    // Структура из генератора
    props: Prop[];
    roll: number[];
    indexes: number[];
}

// ==========================================
// CONSUMABLE ITEM (зелья, баффы)
// ==========================================

export interface ConsumableItem extends BaseItem {
    category: 'consumable';
    consumableType: 'health_potion' | 'mana_potion' | 'buff' | 'food';
    consumableValue: number; // количество HP/MP/длительность
}

// ==========================================
// MATERIAL ITEM (крафтинг)
// ==========================================

export interface MaterialItem extends BaseItem {
    category: 'material';
    materialTier: number; // 1-5 (common to legendary)
}

// ==========================================
// QUEST ITEM (квестовые предметы)
// ==========================================

export interface QuestItem extends BaseItem {
    category: 'quest';
}

// ==========================================
// UNION TYPE
// ==========================================

export type Item = EquipmentItem | ConsumableItem | MaterialItem | QuestItem;

// ==========================================
// INVENTORY & EQUIPMENT
// ==========================================

export interface InventorySlot {
    id: string;
    item: Item | null;
    quantity: number;
}

export interface EquipmentSlot {
    id: string;
    type: ItemSlotType;
    item: EquipmentItem | null; // Только equipment
}

export interface WarriorEquipment {
    warriorId: string;
    slots: EquipmentSlot[];
}

export interface InventoryState {
    items: InventorySlot[];      // Глобальный инвентарь (все категории)
    equipment: WarriorEquipment[]; // Экипировка воинов (только equipment)
}

// ==========================================
// LEGACY TYPES (для обратной совместимости)
// ==========================================

export type ItemType = 'weapon' | 'armor' | 'consumable' | 'material';

export interface ItemStats {
    attack?: number;
    defense?: number;
    health?: number;
    speed?: number;
    magic?: number;
    durability?: number;
    maxDurability?: number;
    value?: number;
    mana?: number;
    stamina?: number;
    [key: string]: number | undefined;
}
