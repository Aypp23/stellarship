import { ItemSlotType, ItemCategory, Item } from '@/types/inventory';

/**
 * Координаты спрайтов для equipment по слотам
 */
export const EQUIPMENT_SPRITE_COORDS: Record<ItemSlotType, { x: number; y: number }> = {
    // Weapons (Row 0)
    tool: { x: 4, y: 0 },      // Sword

    // Armor (Row 1)
    offhand: { x: 11, y: 1 },  // Shield
    head: { x: 13, y: 1 },     // Helmet
    chest: { x: 12, y: 1 },    // Armor
    shoulders: { x: 12, y: 1 }, // Armor
    legs: { x: 12, y: 1 },     // Armor
    feet: { x: 12, y: 1 },     // Armor
    hand: { x: 12, y: 1 },     // Armor
    back: { x: 12, y: 1 },     // Cape

    // Accessories (Row 2)
    neck: { x: 1, y: 2 },      // Necklace
    finger: { x: 0, y: 2 },    // Ring
    waist: { x: 0, y: 2 },     // Belt
    wrist: { x: 0, y: 2 },     // Bracer
};

/**
 * Координаты спрайтов для других категорий
 */
export const CATEGORY_SPRITE_COORDS: Partial<Record<ItemCategory, { x: number; y: number }>> = {
    consumable: { x: 0, y: 3 }, // Potion icon
    material: { x: 2, y: 3 },   // Material icon
    quest: { x: 3, y: 0 },      // Scroll icon
};

/**
 * Получить координаты спрайта для предмета
 */
export function getItemSpriteCoords(item: Item): { x: number; y: number } {
    // Приоритет 1: явно указанные координаты
    if (item.iconCoords) {
        return item.iconCoords;
    }

    // Приоритет 2: координаты по слоту для equipment
    if (item.category === 'equipment' && item.slot) {
        // Backend returns uppercase slot names (BACK, CHEST, etc)
        // Convert to lowercase to match our coordinate mapping
        const slotLowercase = item.slot.toLowerCase() as ItemSlotType;

        if (EQUIPMENT_SPRITE_COORDS[slotLowercase]) {
            return EQUIPMENT_SPRITE_COORDS[slotLowercase];
        }
    }

    // Приоритет 3: координаты по категории
    if (CATEGORY_SPRITE_COORDS[item.category]) {
        return CATEGORY_SPRITE_COORDS[item.category]!;
    }

    // Fallback
    return { x: 0, y: 0 };
}
