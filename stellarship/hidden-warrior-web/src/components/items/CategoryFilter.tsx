import { ItemCategory } from '@/types/inventory';
import { getCategoryDisplayName, getCategoryColor } from '@/utils/itemUtils';

interface CategoryFilterProps {
    selectedCategory: ItemCategory | 'all';
    onCategoryChange: (category: ItemCategory | 'all') => void;
    className?: string;
}

export function CategoryFilter({ selectedCategory, onCategoryChange, className = '' }: CategoryFilterProps) {
    const categories: (ItemCategory | 'all')[] = ['all', 'equipment', 'consumable', 'material', 'quest'];

    return (
        <div className={`category-filter flex gap-2 ${className}`}>
            {categories.map(cat => {
                const isActive = selectedCategory === cat;
                const color = cat === 'all' ? '#666' : getCategoryColor(cat as ItemCategory);

                return (
                    <button
                        key={cat}
                        className={`
              category-btn px-4 py-2 rounded border-2 transition-all duration-200
              font-medieval text-sm tracking-wider
              ${isActive
                                ? 'bg-white/10 scale-105'
                                : 'bg-transparent hover:bg-white/5 hover:scale-102'
                            }
            `}
                        onClick={() => onCategoryChange(cat)}
                        style={{
                            borderColor: isActive ? color : `${color}40`,
                            color: isActive ? color : '#888'
                        }}
                    >
                        {cat === 'all' ? 'ALL' : getCategoryDisplayName(cat as ItemCategory).toUpperCase()}
                    </button>
                );
            })}
        </div>
    );
}
