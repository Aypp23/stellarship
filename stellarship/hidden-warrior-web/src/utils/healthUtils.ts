import { Warrior } from '@/types/game';

/**
 * Calculates the maximum health of a warrior based on their stats.
 * Formula: Base HP (100) + (Endurance * 10)
 */
export function calculateMaxHealth(warrior: Warrior | { endurance: number }): number {
    const baseHealth = 100;
    const enduranceMultiplier = 10;
    return baseHealth + (warrior.endurance * enduranceMultiplier);
}


