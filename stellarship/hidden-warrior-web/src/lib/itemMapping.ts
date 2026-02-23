
import { Item } from '@/types/inventory';

export const ITEMS_SPRITESHEET = '/assets/ui/Spritesheet/items.png';
export const SPRITE_SIZE = 16;

// Helper to get sprite coordinates based on item properties
export function getItemSpriteCoords(item: Item | any): { x: number, y: number } {
    if (!item) return { x: 0, y: 0 };

    // 1. Explicit coordinates on the item
    if (item.spriteCoords) {
        return item.spriteCoords;
    }
    if (item.iconCoords) {
        return item.iconCoords;
    }

    // 2. Map by specific ID or Name (Overrides)
    // Add specific overrides here if needed


    // 3. Map by Slot (Equipment)
    // Check slot, type, AND name for keywords
    const slot = (item.slot || item.type || '').toLowerCase();
    const name = (item.name || '').toLowerCase();

    // Weapon / Tool
    if (slot === 'weapon' || slot === 'tool' || slot === 'mainhand' || name.includes('sword') || name.includes('blade') || name.includes('axe')) return { x: 4, y: 0 }; // Generic Sword

    // Armor
    if (slot === 'head' || slot === 'helmet' || name.includes('helm') || name.includes('hat') || name.includes('cap')) return { x: 13, y: 1 }; // Helmet
    if (slot === 'chest' || slot === 'body' || name.includes('tunic') || name.includes('robe') || name.includes('plate') || name.includes('mail')) return { x: 12, y: 1 }; // Armor
    if (slot === 'shoulders' || name.includes('shoulder') || name.includes('pauldron')) return { x: 12, y: 1 }; // Armor (fallback)
    if (slot === 'legs' || slot === 'pants' || name.includes('leggings') || name.includes('greaves')) return { x: 12, y: 1 }; // Armor (fallback)
    if (slot === 'feet' || slot === 'boots' || name.includes('boots') || name.includes('shoes') || name.includes('greaves')) return { x: 12, y: 1 }; // Armor (fallback)
    if (slot === 'hands' || slot === 'gloves' || name.includes('gloves') || name.includes('gauntlets')) return { x: 12, y: 1 }; // Armor (fallback)

    // Accessories
    if (slot === 'finger' || slot === 'ring' || name.includes('ring')) return { x: 0, y: 2 }; // Ring
    if (slot === 'neck' || slot === 'amulet' || name.includes('amulet') || name.includes('necklace')) return { x: 1, y: 2 }; // Amulet
    if (slot === 'waist' || slot === 'belt' || name.includes('belt')) return { x: 0, y: 2 }; // Belt (fallback to ring/accessory row)
    if (slot === 'wrist' || slot === 'bracers' || name.includes('bracer')) return { x: 0, y: 2 }; // Bracers (fallback)

    // Offhand
    if (slot === 'offhand' || slot === 'shield' || name.includes('shield')) return { x: 11, y: 1 }; // Shield
    if (slot === 'back' || slot === 'cloak' || name.includes('cloak') || name.includes('cape')) return { x: 12, y: 1 }; // Cloak (fallback)

    // 4. Map by Category/Type
    const type = (item.type || '').toLowerCase();
    const category = (item.category || '').toLowerCase();

    if (category === 'consumable' || type === 'consumable' || type === 'potion' || name.includes('potion') || name.includes('flask')) {
        // Potions/Food
        if (name.includes('health') || name.includes('healing')) return { x: 0, y: 3 }; // Red Potion
        if (name.includes('mana') || name.includes('magic')) return { x: 1, y: 3 }; // Blue Potion
        if (name.includes('stamina') || name.includes('energy')) return { x: 2, y: 3 }; // Yellow/Green Potion
        return { x: 0, y: 3 }; // Generic Potion
    }

    if (category === 'material' || type === 'material') {
        return { x: 2, y: 3 }; // Generic Material
    }

    if (type === 'quest' || category === 'quest' || name.includes('scroll') || name.includes('letter')) {
        return { x: 3, y: 0 }; // Scroll/Quest item
    }

    // Default Fallback
    return { x: 0, y: 0 };
}

