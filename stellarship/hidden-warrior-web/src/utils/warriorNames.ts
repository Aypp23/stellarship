// Генератор имен для воинов
// Множество комбинаций для создания уникальных и интересных имен

export const warriorNameParts = {
  prefixes: [
    // Благородные титулы
    'Sir', 'Lord', 'Dame', 'Lady', 'Baron', 'Count', 'Duke', 'King', 'Queen', 'Prince', 'Princess',
    // Военные звания
    'Captain', 'Commander', 'General', 'Admiral', 'Colonel', 'Major', 'Sergeant', 'Lieutenant',
    // Мистические префиксы
    'Shadow', 'Dark', 'Light', 'Storm', 'Fire', 'Ice', 'Thunder', 'Wind', 'Earth', 'Spirit',
    'Mystic', 'Arcane', 'Ancient', 'Eternal', 'Divine', 'Sacred', 'Blessed', 'Cursed',
    // Эпические префиксы
    'Iron', 'Steel', 'Golden', 'Silver', 'Crimson', 'Azure', 'Emerald', 'Violet', 'Obsidian',
    'Titan', 'Giant', 'Dragon', 'Phoenix', 'Wolf', 'Eagle', 'Lion', 'Tiger', 'Bear'
  ],
  
  coreNames: [
    // Классические имена воинов
    'Aiden', 'Alexander', 'Arthur', 'Blake', 'Caleb', 'Darius', 'Erik', 'Felix', 'Gareth', 'Hector',
    'Ivan', 'Jaxon', 'Kane', 'Liam', 'Marcus', 'Nathan', 'Orion', 'Preston', 'Quinn', 'Rex',
    'Sebastian', 'Tristan', 'Ulrich', 'Victor', 'William', 'Xander', 'Yuri', 'Zane',
    
    // Женские имена
    'Aria', 'Bella', 'Cora', 'Diana', 'Elena', 'Freya', 'Grace', 'Helena', 'Iris', 'Jade',
    'Kira', 'Luna', 'Maya', 'Nora', 'Ophelia', 'Penelope', 'Quinn', 'Rose', 'Sage', 'Thea',
    'Una', 'Vera', 'Willow', 'Xara', 'Yara', 'Zara',
    
    // Фантазийные имена
    'Aethon', 'Baelor', 'Caelum', 'Drakon', 'Eldric', 'Fenris', 'Grimm', 'Haldir', 'Icarus', 'Jorah',
    'Kael', 'Lothar', 'Magnus', 'Nyx', 'Orion', 'Perseus', 'Ragnar', 'Soren', 'Thor', 'Uther',
    'Vex', 'Wulfric', 'Xerxes', 'Ymir', 'Zephyr'
  ],
  
  suffixes: [
    // Военные суффиксы
    'the Brave', 'the Bold', 'the Fierce', 'the Strong', 'the Mighty', 'the Valiant', 'the Noble',
    'the Swift', 'the Sharp', 'the Blade', 'the Shield', 'the Hammer', 'the Axe', 'the Bow',
    // Мистические суффиксы
    'of Shadows', 'of Light', 'of Fire', 'of Ice', 'of Storms', 'of Thunder', 'of Wind', 'of Earth',
    'the Mystic', 'the Sage', 'the Seer', 'the Prophet', 'the Enchanter', 'the Sorcerer', 'the Mage',
    // Эпические суффиксы
    'the Destroyer', 'the Conqueror', 'the Slayer', 'the Hunter', 'the Guardian', 'the Protector',
    'the Legend', 'the Myth', 'the Eternal', 'the Immortal', 'the Unbreakable', 'the Invincible',
    // Географические суффиксы
    'of the North', 'of the South', 'of the East', 'of the West', 'of the Mountains', 'of the Seas',
    'of the Forests', 'of the Deserts', 'of the Plains', 'of the Valleys', 'of the Rivers', 'of the Lakes'
  ]
};

export const warriorTitles = [
  'Warrior', 'Fighter', 'Guardian', 'Champion', 'Hero', 'Knight', 'Paladin', 'Ranger', 'Rogue', 'Mage',
  'Wizard', 'Sorcerer', 'Warlock', 'Priest', 'Monk', 'Assassin', 'Berserker', 'Barbarian', 'Crusader',
  'Templar', 'Hunter', 'Scout', 'Spy', 'Mercenary', 'Soldier', 'Captain', 'Commander', 'General',
  'Dragon Slayer', 'Giant Killer', 'Demon Hunter', 'Beast Master', 'Spell Weaver', 'Rune Master',
  'Shadow Walker', 'Light Bringer', 'Fire Wielder', 'Ice Shaper', 'Storm Caller', 'Earth Shaker'
];

// Функция для генерации случайного имени
export function generateWarriorName(): string {
  const { prefixes, coreNames, suffixes } = warriorNameParts;
  
  // Случайно выбираем тип генерации
  const generationType = Math.random();
  
  if (generationType < 0.3) {
    // Префикс + Имя + Суффикс
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const core = coreNames[Math.floor(Math.random() * coreNames.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    return `${prefix} ${core} ${suffix}`;
  } else if (generationType < 0.6) {
    // Имя + Суффикс
    const core = coreNames[Math.floor(Math.random() * coreNames.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    return `${core} ${suffix}`;
  } else if (generationType < 0.8) {
    // Префикс + Имя
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const core = coreNames[Math.floor(Math.random() * coreNames.length)];
    return `${prefix} ${core}`;
  } else {
    // Имя + Титул
    const core = coreNames[Math.floor(Math.random() * coreNames.length)];
    const title = warriorTitles[Math.floor(Math.random() * warriorTitles.length)];
    return `${core} the ${title}`;
  }
}

// Функция для генерации нескольких имен
export function generateMultipleNames(count: number = 5): string[] {
  const names = new Set<string>();
  
  while (names.size < count) {
    const name = generateWarriorName();
    names.add(name);
  }
  
  return Array.from(names);
}
