import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NODE_ENV === 'production' 
  ? (process.env.NEXT_PUBLIC_API_URL || 'https://api.hiddenwarrior.fun/api')
  : 'http://localhost:3001/api';

export const dynamic = 'force-dynamic';
// Кэширование на 30 секунд (weekly leaderboard обновляется реже)
export const revalidate = 30;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '10';

    const response = await fetch(`${BACKEND_URL}/leaderboard/weekly?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 30 } // Кэшируем на 30 секунд
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { message: errorData.message || 'Failed to fetch weekly leaderboard' },
        { status: response.status }
      );
    }

    const leaderboardData = await response.json();
    
    // Добавляем заголовки кэширования
    return NextResponse.json(leaderboardData, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=45'
      }
    });

  } catch (error) {
    console.error('Weekly leaderboard API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

