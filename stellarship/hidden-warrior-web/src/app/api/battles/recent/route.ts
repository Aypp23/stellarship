import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/authMiddleware';

const BACKEND_API_URL = process.env.NODE_ENV === 'production' 
  ? (process.env.NEXT_PUBLIC_API_URL || 'https://api.hiddenwarrior.fun/api')
  : 'http://localhost:3001/api';

export const dynamic = 'force-dynamic';
// Кэширование на 1 секунду для более быстрого обновления LIVE FEED
export const revalidate = 1;

export async function GET(request: NextRequest) {
  try {
    // Проверяем авторизацию
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем параметры запроса
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10); // Увеличили лимит до 20 для более полной истории
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Делаем запрос к основному API с кэшированием
    const response = await fetch(`${BACKEND_API_URL}/battles/recent?limit=${limit}&offset=${offset}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authResult.token}`
      },
      next: { revalidate: 1 } // Кэшируем на 1 секунду для более быстрого обновления
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const battles = await response.json();
    
    // Добавляем заголовки кэширования
    return NextResponse.json(battles, {
      headers: {
        'Cache-Control': 'public, s-maxage=1, stale-while-revalidate=2'
      }
    });
  } catch (error) {
    console.error('Error fetching battle history:', error);
    return NextResponse.json({ error: 'Failed to fetch battle history' }, { status: 500 });
  }
}
