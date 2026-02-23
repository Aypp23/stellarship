export interface EnemyType {
    id: string;
    name: string;
    description: string;
    avatarUrl: string;
    minLevel: number;
    maxLevel: number;
    baseStrength: number;
    baseAgility: number;
    baseEndurance: number;
    baseIntelligence: number;
    statVariance: number; // 0.0 to 1.0 (e.g. 0.1 = +/- 10%)
}
