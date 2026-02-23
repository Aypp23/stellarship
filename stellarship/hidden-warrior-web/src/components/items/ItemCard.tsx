import { Item, EquipmentItem } from '@/types/inventory';
import { ItemIcon } from './ItemIcon';
import {
    formatItemName,
    getCategoryDisplayName,
    getCategoryColor,
    isEquipmentItem,
    getActiveProps,
    getItemRarity
} from '@/utils/itemUtils';

interface ItemCardProps {
    item: Item;
    showDetails?: boolean;
    onClick?: () => void;
    className?: string;
}

export function ItemCard({ item, showDetails = true, onClick, className = '' }: ItemCardProps) {
    const categoryColor = getCategoryColor(item.category);

    // Для equipment определяем редкость
    const rarity = isEquipmentItem(item) ? getItemRarity(item) : null;
    const rarityClass = rarity ? `rarity-${rarity}` : '';

    return (
        <div
            className={`item-card ${rarityClass} ${className}`}
            onClick={onClick}
            style={{ borderColor: categoryColor }}
        >
            {/* Header */}
            <div className="item-card-header">
                <ItemIcon item={item} size="md" />
                <div className="item-info">
                    <h4 className="item-name">{formatItemName(item.name)}</h4>
                    <span className="item-category" style={{ color: categoryColor }}>
                        {getCategoryDisplayName(item.category)}
                    </span>
                </div>
            </div>

            {/* Equipment Props */}
            {showDetails && isEquipmentItem(item) && (
                <EquipmentDetails item={item} />
            )}

            {/* Stackable Info */}
            {item.stackable && (
                <div className="item-stack-info text-xs text-gray-500">
                    Max Stack: {item.maxStack}
                </div>
            )}
        </div>
    );
}

function EquipmentDetails({ item }: { item: EquipmentItem }) {
    const activeProps = getActiveProps(item);

    if (activeProps.length === 0) return null;

    return (
        <div className="equipment-details mt-2">
            <div className="props-list flex flex-wrap gap-1">
                {activeProps.map((prop, idx) => (
                    <span key={idx} className="prop-badge text-xs px-2 py-0.5 bg-black/20 rounded border border-white/10">
                        {prop.name}
                    </span>
                ))}
            </div>
        </div>
    );
}
