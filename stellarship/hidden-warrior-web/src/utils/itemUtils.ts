import { Item, EquipmentItem, ConsumableItem, MaterialItem, Prop, ItemCategory } from '@/types/inventory';

// ==========================================
// TYPE GUARDS
// ==========================================

export function isEquipmentItem(item: Item): item is EquipmentItem {
    return item.category === 'equipment';
}

export function isConsumableItem(item: Item): item is ConsumableItem {
    return item.category === 'consumable';
}

export function isMaterialItem(item: Item): item is MaterialItem {
    return item.category === 'material';
}

export function isQuestItem(item: Item): item is Item & { category: 'quest' } {
    return item.category === 'quest';
}

// ==========================================
// EQUIPMENT UTILS
// ==========================================

/**
 * Получить активные аффиксы (исключая пустые "-")
 */
export function getActiveProps(item: EquipmentItem): Prop[] {
    return item.props.filter(prop => prop.name !== '-');
}

/**
 * Определить редкость equipment по количеству активных props
 */
export function getItemRarity(item: EquipmentItem): 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' {
    const activeCount = getActiveProps(item).length;

    if (activeCount >= 5) return 'legendary';
    if (activeCount >= 4) return 'epic';
    if (activeCount >= 3) return 'rare';
    if (activeCount >= 2) return 'uncommon';
    return 'common';
}

/**
 * Конвертировать weight в число
 */
export function normalizeWeight(weight: number | string): number {
    return typeof weight === 'string' ? parseFloat(weight) : weight;
}

// ==========================================
// DISPLAY UTILS
// ==========================================

/**
 * Форматировать название предмета (capitalize)
 */
export function formatItemName(name: string): string {
    return name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Получить описание предмета на основе его типа
 */
export function getItemDescription(item: Item): string {
    if (isEquipmentItem(item)) {
        const activeProps = getActiveProps(item);
        if (activeProps.length === 0) {
            return `A ${item.slot} piece of equipment.`;
        }

        const materials = activeProps
            .filter(p => ['titanium', 'steel', 'iron', 'copper', 'leather', 'diamond', 'bronze', 'obsidian'].includes(p.name.toLowerCase()))
            .map(p => p.name);

        if (materials.length > 0) {
            return `A ${item.slot} crafted from ${materials.join(', ')}.`;
        }

        return `A ${item.slot} with special properties.`;
    }

    if (isConsumableItem(item)) {
        switch (item.consumableType) {
            case 'health_potion':
                return `Restores ${item.consumableValue} health points.`;
            case 'mana_potion':
                return `Restores ${item.consumableValue} mana points.`;
            case 'buff':
                return `Grants a buff for ${item.consumableValue} seconds.`;
            case 'food':
                return `Provides nourishment.`;
            default:
                return item.description || 'A consumable item.';
        }
    }

    if (isMaterialItem(item)) {
        const tierNames = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
        return `${tierNames[item.materialTier - 1] || 'Unknown'} crafting material.`;
    }

    return item.description || 'A mysterious item.';
}

/**
 * Получить название категории для отображения
 */
export function getCategoryDisplayName(category: ItemCategory): string {
    const names: Record<ItemCategory, string> = {
        equipment: 'Equipment',
        consumable: 'Consumable',
        material: 'Material',
        quest: 'Quest Item',
    };
    return names[category];
}

/**
 * Получить цвет категории
 */
export function getCategoryColor(category: ItemCategory): string {
    const colors: Record<ItemCategory, string> = {
        equipment: '#d4af37', // Gold
        consumable: '#00ff00', // Green
        material: '#8b7355', // Brown
        quest: '#9370db', // Purple
    };
    return colors[category];
}

// ==========================================
// CONSUMABLE UTILS
// ==========================================

/**
 * Получить эмодзи иконку для consumable
 */
export function getConsumableIcon(type: string): string {
    const icons: Record<string, string> = {
        health_potion: '❤️',
        mana_potion: '💙',
        buff: '✨',
        food: '🍖',
    };
    return icons[type] || '📦';
}

// ==========================================
// MATERIAL UTILS
// ==========================================

/**
 * Получить цвет tier материала
 */
export function getMaterialTierColor(tier: number): string {
    const colors = [
        '#9d9d9d', // 1 - Common (gray)
        '#1eff00', // 2 - Uncommon (green)
        '#0070dd', // 3 - Rare (blue)
        '#a335ee', // 4 - Epic (purple)
        '#ff8000', // 5 - Legendary (orange)
    ];
    return colors[tier - 1] || colors[0];
}

/**
 * Получить название tier
 */
export function getMaterialTierName(tier: number): string {
    const names = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
    return names[tier - 1] || 'Unknown';
}
