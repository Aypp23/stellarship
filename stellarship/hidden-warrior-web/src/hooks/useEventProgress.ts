import { useEffect, useCallback } from 'react';
import { useEventStore } from '@/store/eventStore';
import apiClient from '@/lib/apiClient';

interface BattleResult {
  isVictory: boolean;
  shadowGloryEarned: number;
  enemyArchetype?: string;
  perfectVictory?: boolean;
}

/**
 * Hook для обновления прогресса события после боя
 * Автоматически определяет активное событие и отправляет прогресс
 */
export function useEventProgress() {
  const { currentEvent, updateEventProgress } = useEventStore();

  /**
   * Обновить прогресс события после боя
   */
  const recordBattle = useCallback(async (result: BattleResult) => {
    console.log('[EventProgress] 🎯 recordBattle called');
    console.log('[EventProgress] Result:', result);
    console.log('[EventProgress] Current event:', currentEvent);
    
    if (!currentEvent) {
      console.log('[EventProgress] ⚠️ No current event - skipping');
      return;
    }

    try {
      console.log('[EventProgress] 📊 Building update data for event type:', currentEvent.eventType);
      
      // Формируем данные для обновления в зависимости от типа события
      const updateData = buildEventUpdateData(currentEvent.eventType, result);
      
      console.log('[EventProgress] 📊 Update data built:', updateData);

      const requestPayload = {
        eventId: currentEvent.id,
        battleOutcome: updateData.battleOutcome,
        metadata: updateData.metadata,
      };
      
      console.log('[EventProgress] 📤 Sending update request:', requestPayload);
      console.log('[EventProgress] 📤 battleOutcome:', updateData.battleOutcome);
      console.log('[EventProgress] 📤 metadata:', updateData.metadata);

      // Отправляем обновление прогресса
      await updateEventProgress(requestPayload);

      console.log('[EventProgress] ✅ Battle recorded successfully!');
    } catch (error) {
      console.error('[EventProgress] ❌ Failed to record battle:', error);
      console.error('[EventProgress] Error details:', error instanceof Error ? error.message : String(error));
      // Не выбрасываем ошибку, чтобы не ломать основной поток боя
    }
  }, [currentEvent, updateEventProgress]);

  /**
   * Проверить и присоединиться к событию автоматически
   */
  const autoJoinEvent = useCallback(async () => {
    if (!currentEvent) return;

    try {
      // Пытаемся получить прогресс - если его нет, значит не участвуем
      const progress = await apiClient.eventsApi.getMyProgress(currentEvent.id);
      
      if (!progress) {
        // Автоматически присоединяемся к событию
        await apiClient.eventsApi.participate(currentEvent.id);
        console.log('[EventProgress] Auto-joined event:', currentEvent.id);
      }
    } catch (error) {
      // Ошибка 404 означает, что не участвуем - это нормально
      if ((error as any)?.status === 404) {
        try {
          await apiClient.eventsApi.participate(currentEvent.id);
          console.log('[EventProgress] Auto-joined event after 404:', currentEvent.id);
        } catch (joinError) {
          console.error('[EventProgress] Failed to auto-join event:', joinError);
        }
      }
    }
  }, [currentEvent]);

  return {
    recordBattle,
    autoJoinEvent,
    currentEvent,
  };
}

/**
 * Построить данные для обновления прогресса в зависимости от типа события
 */
function buildEventUpdateData(
  eventType: string,
  result: BattleResult
): {
  battleOutcome: 'Victory' | 'Defeat';
  metadata?: Record<string, any>;
} {
  const battleOutcome = result.isVictory ? 'Victory' : 'Defeat';
  let metadata: Record<string, any> = {};

  // Дополнительные метаданные в зависимости от типа события
  switch (eventType) {
    case 'SHADOW_GLORY_RUSH':
      metadata = {
        shadowGloryEarned: result.shadowGloryEarned,
      };
      break;

    case 'TOURNAMENT':
      metadata = {
        perfectVictory: result.perfectVictory,
      };
      break;

    case 'ARCHETYPE_MASTERY':
      if (result.enemyArchetype) {
        metadata = {
          enemyArchetype: result.enemyArchetype,
        };
      }
      break;

    case 'PERFECT_WARRIOR':
      metadata = {
        perfectVictory: result.perfectVictory,
      };
      break;

    case 'RANKED_SEASON':
      // ELO-подобная система
      const rankPoints = result.isVictory ? 25 : -10;
      metadata = {
        rankPoints,
        wins: result.isVictory ? 1 : 0,
        losses: result.isVictory ? 0 : 1,
      };
      break;

    case 'SPEED_DEMON':
      metadata = {
        shadowGloryEarned: result.shadowGloryEarned,
      };
      break;

    case 'SHADOW_GLORY_MASTER':
      metadata = {
        shadowGloryEarned: result.shadowGloryEarned,
      };
      break;

    case 'BOSS_RAID':
      metadata = {
        damageDealt: result.shadowGloryEarned,
      };
      break;

    default:
      metadata = {
        shadowGloryEarned: result.shadowGloryEarned,
      };
      break;
  }

  return {
    battleOutcome,
    metadata,
  };
}

/**
 * Hook для автоматического присоединения к событию при монтировании компонента
 */
export function useAutoJoinEvent() {
  const { currentEvent } = useEventStore();
  const { autoJoinEvent } = useEventProgress();

  useEffect(() => {
    if (currentEvent) {
      autoJoinEvent();
    }
  }, [currentEvent?.id]);

  return { currentEvent };
}

/**
 * Утилита для расчета бонусов от события
 */
export function calculateEventBonus(
  baseReward: number,
  eventType: string | null,
  eventConfig: any
): number {
  if (!eventType) return baseReward;

  switch (eventType) {
    case 'SHADOW_GLORY_RUSH':
      const multiplier = eventConfig?.multiplier || 1;
      return baseReward * multiplier;

    case 'TOURNAMENT':
      // Бонус за streak
      const streak = eventConfig?.currentStreak || 0;
      const streakBonus = Math.floor(streak / 3) * 0.1; // +10% за каждые 3 победы подряд
      return Math.floor(baseReward * (1 + streakBonus));

    case 'RANKED_SEASON':
      // Бонус зависит от ранга
      const rank = eventConfig?.rank || 999;
      const rankBonus = rank <= 10 ? 0.5 : rank <= 50 ? 0.25 : 0;
      return Math.floor(baseReward * (1 + rankBonus));

    default:
      return baseReward;
  }
}

/**
 * Утилита для получения сообщения о прогрессе события
 */
export function getEventProgressMessage(
  eventType: string,
  result: BattleResult,
  eventConfig?: any
): string | null {
  switch (eventType) {
    case 'SHADOW_GLORY_RUSH':
      const multiplier = eventConfig?.multiplier || 1;
      if (multiplier > 1) {
        return `Event Bonus: ${multiplier}x Shadow Glory!`;
      }
      return null;

    case 'TOURNAMENT':
      if (result.isVictory) {
        return 'Tournament win recorded! Keep the streak going!';
      }
      return 'Tournament loss recorded. Next battle!';

    case 'PERFECT_WARRIOR':
      if (result.perfectVictory) {
        return 'Perfect Victory! Event progress increased!';
      }
      return null;

    case 'ARCHETYPE_MASTERY':
      if (result.isVictory && result.enemyArchetype) {
        return `Archetype mastered: ${result.enemyArchetype}!`;
      }
      return null;

    case 'REVERSE_BATTLE':
      if (!result.isVictory) {
        return 'Reverse Battle: Loss gives you points!';
      }
      return null;

    default:
      return null;
  }
}

