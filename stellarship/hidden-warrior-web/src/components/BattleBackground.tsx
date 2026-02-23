import React, { useMemo } from 'react';
import { Warrior } from '@/types/game';

interface BattleBackgroundProps {
  hero: Warrior;
  enemy: Warrior;
  className?: string;
}

const BattleBackground: React.FC<BattleBackgroundProps> = ({
  hero,
  enemy,
  className = ''
}) => {
  // Определяем тип фона на основе характеристик героя и противника
  const backgroundImage = useMemo(() => {
    // Определяем доминирующую характеристику героя
    const heroBuild = getBuildType(hero);
    const enemyBuild = getBuildType(enemy);
    
    // Выбираем фон на основе доминирующих характеристик
    if (heroBuild === 'Intelligence' || enemyBuild === 'Intelligence') {
      return '/assets/backgrounds/ancient_ruins.png'; // Магический фон
    } else if (heroBuild === 'Agility' || enemyBuild === 'Agility') {
      return '/assets/backgrounds/misty_forest.png'; // Фон для ловких персонажей
    } else if (heroBuild === 'Endurance' || enemyBuild === 'Endurance') {
      return '/assets/backgrounds/arena_silhouette.png'; // Фон для выносливых персонажей
    } else {
      return '/assets/backgrounds/fe.png'; // Стандартный фон для силовых персонажей
    }
  }, [hero, enemy]);

  return (
    <div 
      className={`absolute inset-0 z-0 ${className}`}
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.3
      }}
    />
  );
};

// Функция для определения доминирующей характеристики воина
function getBuildType(warrior: Warrior): 'Strength' | 'Agility' | 'Endurance' | 'Intelligence' {
  const { strength, agility, endurance, intelligence } = warrior;
  const stats = [
    { type: 'Strength', value: strength },
    { type: 'Agility', value: agility },
    { type: 'Endurance', value: endurance },
    { type: 'Intelligence', value: intelligence }
  ];
  
  // Сортируем характеристики по убыванию значения
  stats.sort((a, b) => b.value - a.value);
  
  // Возвращаем тип доминирующей характеристики
  return stats[0].type as 'Strength' | 'Agility' | 'Endurance' | 'Intelligence';
}

export default BattleBackground;
