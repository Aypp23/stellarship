import { Warrior } from '@/types/game';
import { BattleLogStep, BattleOutcome, BattleHistoryEntry, BattleMetrics } from '@/types/battle';
import {
  battleStartPhrases,
  attackPhrases,
  defensePhrases,
  missPhrases,
  critPhrases,
  victoryPhrases,
  drawPhrases,
  tauntPhrases,
  battleLocations,
  enemyNames,
} from './battlePhrases';

// --- Constants & Config ---
const BASE_HIT_CHANCE = 0.85; // 85% base hit chance
const MIN_HIT_CHANCE = 0.50;
const MAX_HIT_CHANCE = 0.95;
const BASE_CRIT_CHANCE = 0.05;
const CRIT_MULTIPLIER = 1.5;
const MAX_ROUNDS = 20;

// --- Helper Functions ---

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Calculates derived stats for a warrior
 */
function getDerivedStats(warrior: Warrior) {
  // Endurance -> HP
  // Base HP 100 + 10 per Endurance
  const maxHp = 100 + (warrior.endurance * 10);

  // Endurance -> Armor (Damage Reduction)
  // 0.5 damage reduction per Endurance
  const armor = Math.floor(warrior.endurance * 0.5);

  // Agility -> Crit Chance
  // Base 5% + 0.5% per Agility point
  const critChance = BASE_CRIT_CHANCE + (warrior.agility * 0.005);

  // Intelligence -> Tactical Chance (Special moves)
  // 1% per Int point
  const tacticalChance = warrior.intelligence * 0.01;

  return { maxHp, armor, critChance, tacticalChance };
}

/**
 * Calculates Hit Chance based on Attacker vs Defender Agility
 */
function calculateHitChance(attacker: Warrior, defender: Warrior): number {
  // 1% hit chance diff per Agility point difference
  const agiDiff = attacker.agility - defender.agility;
  let chance = BASE_HIT_CHANCE + (agiDiff * 0.01);

  // Clamp
  return Math.max(MIN_HIT_CHANCE, Math.min(MAX_HIT_CHANCE, chance));
}

/**
 * Calculates Raw Damage based on Strength
 */
function calculateDamage(attacker: Warrior, isCrit: boolean): number {
  // Base Damage = Strength * 2
  const baseDmg = attacker.strength * 2;

  // Variance +/- 15%
  const variance = 0.85 + (Math.random() * 0.3);

  let damage = baseDmg * variance;

  if (isCrit) {
    damage *= CRIT_MULTIPLIER;
  }

  return Math.floor(damage);
}

// --- Main Simulation Engine ---

export interface SimulationResult {
  outcome: BattleOutcome;
  log: BattleLogStep[];
  winner: Warrior;
  loser: Warrior;
  metrics: {
    rounds: number;
    totalDamage: number;
  };
}

export function simulateBattle(hero: Warrior, enemy: Warrior): SimulationResult {
  const log: BattleLogStep[] = [];

  // 1. Setup Stats
  const heroStats = getDerivedStats(hero);
  const enemyStats = getDerivedStats(enemy);

  let heroHp = heroStats.maxHp;
  let enemyHp = enemyStats.maxHp;

  // Initial Log
  const location = getRandom(battleLocations);
  log.push({
    type: 'start',
    text: `Battle Location: ${location}`,
    heroHealth: heroHp,
    enemyHealth: enemyHp
  });

  log.push({
    type: 'start',
    text: `FIGHT! ${hero.name} (HP: ${heroHp}) vs ${enemy.name} (HP: ${enemyHp})`,
    heroHealth: heroHp,
    enemyHealth: enemyHp
  });

  // Taunt Phase
  if (Math.random() < 0.6) {
    log.push({
      type: 'taunt',
      text: getRandom(tauntPhrases)
        .replace('{attacker}', hero.name)
        .replace('{defender}', enemy.name),
      heroHealth: heroHp,
      enemyHealth: enemyHp
    });
  }

  let round = 1;
  let totalDamage = 0;

  // Battle Loop
  while (heroHp > 0 && enemyHp > 0 && round <= MAX_ROUNDS) {
    // --- Player Turn ---
    if (heroHp > 0) {
      const turnResult = processTurn(hero, enemy, heroStats, enemyStats, heroHp, enemyHp);
      enemyHp = turnResult.newDefenderHp;
      totalDamage += turnResult.damageDealt;

      // Fix log HP context
      const turnLogs = turnResult.logs.map(l => ({
        ...l,
        heroHealth: heroHp,
        enemyHealth: enemyHp
      }));
      log.push(...turnLogs);
    }

    // Check if enemy died
    if (enemyHp <= 0) break;

    // --- Enemy Turn ---
    if (enemyHp > 0) {
      const turnResult = processTurn(enemy, hero, enemyStats, heroStats, enemyHp, heroHp);
      heroHp = turnResult.newDefenderHp;
      totalDamage += turnResult.damageDealt;

      // Fix log HP context
      const turnLogs = turnResult.logs.map(l => ({
        ...l,
        heroHealth: heroHp,
        enemyHealth: enemyHp
      }));
      log.push(...turnLogs);
    }

    round++;
  }

  // Determine Outcome
  let outcome: BattleOutcome = 'Draw';
  let winner = hero;
  let loser = enemy;

  if (heroHp > 0 && enemyHp <= 0) {
    outcome = 'Victory';
    winner = hero;
    loser = enemy;
    log.push({
      type: 'victory',
      text: getRandom(victoryPhrases).replace('{winner}', hero.name),
      heroHealth: heroHp,
      enemyHealth: 0
    });
  } else if (enemyHp > 0 && heroHp <= 0) {
    outcome = 'Defeat';
    winner = enemy;
    loser = hero;
    log.push({
      type: 'victory',
      text: getRandom(victoryPhrases).replace('{winner}', enemy.name),
      heroHealth: 0,
      enemyHealth: enemyHp
    });
  } else {
    outcome = 'Draw';
    log.push({
      type: 'draw',
      text: getRandom(drawPhrases),
      heroHealth: heroHp,
      enemyHealth: enemyHp
    });
  }

  return {
    outcome,
    log,
    winner,
    loser,
    metrics: {
      rounds: round,
      totalDamage
    }
  };
}

function processTurn(
  attacker: Warrior,
  defender: Warrior,
  attackerStats: ReturnType<typeof getDerivedStats>,
  defenderStats: ReturnType<typeof getDerivedStats>,
  attackerHp: number,
  defenderHp: number
): { newDefenderHp: number; damageDealt: number; logs: BattleLogStep[] } {
  const logs: BattleLogStep[] = [];
  let newDefenderHp = defenderHp;
  let damageDealt = 0;

  // 1. Tactical Check (Intelligence)
  // Small chance to do something special before attack
  let guaranteedHit = false;
  if (Math.random() < attackerStats.tacticalChance) {
    logs.push({
      type: 'effect',
      text: `${attacker.name} spots a weakness! (Tactical Advantage)`,
      // HP will be filled by caller
    });
    guaranteedHit = true;
  }

  // 2. Hit Check (Agility)
  const hitChance = guaranteedHit ? 1.0 : calculateHitChance(attacker, defender);
  const isHit = Math.random() < hitChance;

  if (!isHit) {
    logs.push({
      type: 'miss',
      text: getRandom(missPhrases)
        .replace('{attacker}', attacker.name)
        .replace('{defender}', defender.name),
      attacker,
      defender,
    });
    return { newDefenderHp, damageDealt, logs };
  }

  // 3. Crit Check (Agility)
  const isCrit = Math.random() < attackerStats.critChance;

  // 4. Damage Calc (Strength vs Endurance)
  const rawDamage = calculateDamage(attacker, isCrit);
  const damage = Math.max(1, rawDamage - defenderStats.armor); // Minimum 1 damage

  newDefenderHp = Math.max(0, defenderHp - damage);
  damageDealt = damage;

  // 5. Log Attack
  let type: BattleLogStep['type'] = isCrit ? 'crit' : 'attack';
  let phrase = isCrit ? getRandom(critPhrases) : getRandom(attackPhrases);

  let text = phrase
    .replace('{attacker}', attacker.name)
    .replace('{defender}', defender.name)
    + ` (-${damage} HP)`;

  if (defenderStats.armor > 0) {
    // Optional: show armor reduction?
    // text += ` [${defenderStats.armor} blocked]`;
  }

  logs.push({
    type,
    text,
    attacker,
    defender,
  });

  return { newDefenderHp, damageDealt, logs };
}

// --- Legacy / Compatibility Exports ---

// Keep this for backward compatibility if needed, but it should ideally be unused
export function generateBattleLog(hero: Warrior, enemy: Warrior, outcomeOverride?: BattleOutcome) {
  // Redirect to new simulation if possible, but the signature is different (outcomeOverride)
  // If outcomeOverride is provided, we can't easily force the simulation to match it without cheating.
  // So we will just run the simulation and ignore the override, OR we warn.
  // But for now, let's just return the simulation log.
  const result = simulateBattle(hero, enemy);
  return result.log;
}

export function calculateBattleRewards(hero: Warrior, enemy: Warrior, outcome: BattleOutcome) {
  const enemyLevel = Math.floor((enemy.strength + enemy.agility + enemy.endurance + enemy.intelligence) / 20);
  const baseExperience = 10 + enemyLevel * 5;
  const baseShadowGlory = 5 + enemyLevel * 2;

  let experienceGained = 0;
  let shadowGloryGained = 0;

  if (outcome === 'Victory') {
    experienceGained = baseExperience;
    shadowGloryGained = baseShadowGlory;
  } else if (outcome === 'Draw') {
    experienceGained = Math.floor(baseExperience / 2);
    shadowGloryGained = Math.floor(baseShadowGlory / 2);
  }

  return { experienceGained, shadowGloryGained };
}

export function generateMockBattleHistory(warriorId: string, warriorStats: any): BattleHistoryEntry[] {
  const history: BattleHistoryEntry[] = [];
  const totalBattles = Math.min(20, Math.floor(Math.random() * 10) + 5);

  for (let i = 0; i < totalBattles; i++) {
    const isVictory = Math.random() < 0.6;
    const opponent = getRandom(enemyNames);
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));

    history.push({
      id: `battle_${warriorId}_${i}`,
      walletAddress: 'mock_wallet',
      enemyName: opponent,
      score: isVictory ? 100 : Math.floor(Math.random() * 50),
      result: isVictory ? 'win' : 'lose',
      timestamp: date.toISOString(),
      transactionHash: `mock_tx_${Date.now()}_${i}`,
      isLive: false,
      battleType: 'PVE'
    });
  }
  return history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export interface WarriorBattleStats {
  wins: number;
  losses: number;
  draws: number;
  total_battles: number;
  win_rate: number;
  battles_this_week: number;
  battles_this_month: number;
  average_battles_per_day: number;
  last_battle_date?: Date;
}

export function calculateBattleMetrics(battles: BattleHistoryEntry[]): WarriorBattleStats {
  const wins = battles.filter(b => b.result === 'win').length;
  const losses = battles.filter(b => b.result === 'lose').length;
  const draws = battles.filter(b => b.result === 'draw').length;
  const total = battles.length;

  const now = new Date();
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(now.getDate() - 7);

  const oneMonthAgo = new Date(now);
  oneMonthAgo.setDate(now.getDate() - 30);

  const battlesThisWeek = battles.filter(b => new Date(b.timestamp) >= oneWeekAgo).length;
  const battlesThisMonth = battles.filter(b => new Date(b.timestamp) >= oneMonthAgo).length;

  const oldestBattleDate = battles.length > 0 ?
    battles.reduce((oldest, battle) =>
      new Date(battle.timestamp) < oldest ? new Date(battle.timestamp) : oldest,
      new Date(battles[0].timestamp)
    ) : new Date();

  const daysSinceFirstBattle = Math.max(1, Math.ceil((now.getTime() - oldestBattleDate.getTime()) / (1000 * 60 * 60 * 24)));
  const averageBattlesPerDay = total / daysSinceFirstBattle;

  const lastBattleDate = battles.length > 0 ?
    battles.reduce((newest, battle) =>
      new Date(battle.timestamp) > newest ? new Date(battle.timestamp) : newest,
      new Date(battles[0].timestamp)
    ) : undefined;

  return {
    wins,
    losses,
    draws,
    total_battles: total,
    win_rate: total > 0 ? (wins / total) * 100 : 0,
    battles_this_week: battlesThisWeek,
    battles_this_month: battlesThisMonth,
    average_battles_per_day: averageBattlesPerDay,
    last_battle_date: lastBattleDate
  };
}

export function getWarriorTitle(metrics: WarriorBattleStats): string {
  if (metrics.total_battles < 10) return 'Novice';
  if (metrics.win_rate < 40) return 'Struggler';
  if (metrics.win_rate < 50) return 'Apprentice';
  if (metrics.win_rate < 60) return 'Fighter';
  if (metrics.win_rate < 70) return 'Veteran';
  if (metrics.win_rate < 80) return 'Champion';
  if (metrics.win_rate < 90) return 'Master';
  return 'Legend';
}
