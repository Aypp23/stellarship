import { Item } from '@/types/inventory';
import { getItemSpriteCoords } from '@/data/itemSpriteCoords';

interface ItemIconProps {
    item: Item | null;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function ItemIcon({ item, size = 'md', className = '' }: ItemIconProps) {
    if (!item) return null;

    const coords = getItemSpriteCoords(item);
    const spriteSize = 16; // Размер спрайта в пикселях
    const scale = size === 'lg' ? 4 : size === 'md' ? 2.5 : 1.5;

    return (
        <div
            className={`item-icon ${className}`}
            style={{
                width: `${spriteSize}px`,
                height: `${spriteSize}px`,
                backgroundImage: `url(/assets/ui/Spritesheet/items.png)`,
                backgroundPosition: `-${coords.x * spriteSize}px -${coords.y * spriteSize}px`,
                imageRendering: 'pixelated',
                transform: `scale(${scale})`,
                transformOrigin: 'center',
            }}
            title={item.name}
        />
    );
}
