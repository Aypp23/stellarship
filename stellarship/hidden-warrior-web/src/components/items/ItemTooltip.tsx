import { Item, EquipmentItem } from '@/types/inventory';
import {
    getItemDescription,
    getCategoryDisplayName,
    isEquipmentItem,
    isConsumableItem,
    isMaterialItem,
    getActiveProps,
    getItemRarity,
    getMaterialTierName
} from '@/utils/itemUtils';
import { SLOT_DISPLAY_NAMES } from '@/types/inventory';

interface ItemTooltipProps {
    item: Item;
}

export function ItemTooltip({ item }: ItemTooltipProps) {
    const description = getItemDescription(item);

    return (
        <div className={`item-tooltip ${isEquipmentItem(item) ? `rarity-${getItemRarity(item)}` : ''}`}>
            {/* Header */}
            <div className="tooltip-header mb-3">
                <h4 className="tooltip-title text-lg font-bold mb-1">{item.name}</h4>
                <div className="tooltip-meta flex gap-2 text-xs">
                    <span className="category-badge px-2 py-0.5 bg-white/10 rounded">
                        {getCategoryDisplayName(item.category)}
                    </span>
                    {isEquipmentItem(item) && (
                        <>
                            <span className="slot-badge px-2 py-0.5 bg-white/10 rounded">
                                {SLOT_DISPLAY_NAMES[item.slot]}
                            </span>
                            <span className="rarity-badge px-2 py-0.5 bg-white/10 rounded">
                                {getItemRarity(item)}
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* Description */}
            <div className="tooltip-description text-sm text-gray-300 italic mb-3">
                {description}
            </div>

            {/* Equipment Props */}
            {isEquipmentItem(item) && <EquipmentTooltipContent item={item} />}

            {/* Consumable Info */}
            {isConsumableItem(item) && (
                <div className="consumable-info text-sm space-y-1">
                    <div className="info-line flex justify-between">
                        <span className="label text-gray-400">Type:</span>
                        <span className="value text-white">{item.consumableType.replace('_', ' ')}</span>
                    </div>
                    <div className="info-line flex justify-between">
                        <span className="label text-gray-400">Effect:</span>
                        <span className="value text-green-400">+{item.consumableValue}</span>
                    </div>
                </div>
            )}

            {/* Material Info */}
            {isMaterialItem(item) && (
                <div className="material-info text-sm">
                    <div className="info-line flex justify-between">
                        <span className="label text-gray-400">Tier:</span>
                        <span className="value text-white">{getMaterialTierName(item.materialTier)} ({item.materialTier}/5)</span>
                    </div>
                </div>
            )}

            {/* Stackable Badge */}
            {item.stackable && (
                <div className="footer-info mt-3 pt-2 border-t border-white/10 text-xs text-gray-400">
                    Stackable (max {item.maxStack})
                </div>
            )}
        </div>
    );
}

function EquipmentTooltipContent({ item }: { item: EquipmentItem }) {
    const activeProps = getActiveProps(item);

    if (activeProps.length === 0) return null;

    return (
        <div className="equipment-tooltip-content">
            <div className="divider h-px bg-white/20 my-2" />
            <div className="props-section text-sm">
                <div className="section-label text-gray-400 text-xs uppercase mb-1">Properties:</div>
                {activeProps.map((prop, idx) => (
                    <div key={idx} className="prop-line text-white">
                        • {prop.name}
                    </div>
                ))}
            </div>
        </div>
    );
}
