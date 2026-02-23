import { NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/authMiddleware';
import { gameApi } from '@/lib/apiClient';

const BACKEND_API_URL = process.env.NODE_ENV === 'production' 
  ? (process.env.NEXT_PUBLIC_API_URL || 'https://api.hiddenwarrior.fun/api')
  : 'http://localhost:3001/api';

export async function POST(request: Request) {
  // Проверяем авторизацию
  const authResult = await authMiddleware(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  try {
    // Получаем данные из запроса
    const body = await request.json();
    const { score, gameType, metadata, battlesPlayed, wins, losses, transactionHash, isWeekly } = body;

    // Проверяем обязательные поля
    if (score === undefined) {
      return NextResponse.json(
        { error: 'Score is required' },
        { status: 400 }
      );
    }

    console.log('Recording game score:', { score, battlesPlayed, wins, losses, transactionHash, isWeekly });

    // Отправляем запрос напрямую на бэкенд с полными данными
    const response = await fetch(`${BACKEND_API_URL}/game/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authResult.token}`
      },
      body: JSON.stringify({
        score,
        gameType,
        metadata,
        battlesPlayed,
        wins,
        losses,
        transactionHash,
        isWeekly
      })
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error recording game score:', error);
    return NextResponse.json(
      { error: 'Failed to record game score' },
      { status: 500 }
    );
  }
}
