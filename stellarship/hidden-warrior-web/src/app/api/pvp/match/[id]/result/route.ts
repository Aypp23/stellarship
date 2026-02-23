import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/authMiddleware';

const BACKEND_API_URL = process.env.NODE_ENV === 'production' 
  ? (process.env.NEXT_PUBLIC_API_URL || 'https://api.hiddenwarrior.fun/api')
  : 'http://localhost:3001/api';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params;
    console.log('[PvP API] Received request for match result submission');
    console.log('[PvP API] Match ID:', matchId);
    
    // Проверяем авторизацию
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      console.log('[PvP API] Auth failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { result } = body;
    
    console.log('[PvP API] Result data:', result);

    if (!result) {
      return NextResponse.json({ error: 'Missing result data' }, { status: 400 });
    }

    // Делаем запрос к основному API
    const response = await fetch(`${BACKEND_API_URL}/pvp/match/${matchId}/result`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authResult.token}`
      },
      body: JSON.stringify({ result })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend API error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to submit result' }, 
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[PvP API] Successfully submitted result to backend');
    return NextResponse.json(data);
  } catch (error) {
    console.error('[PvP API] Error submitting PvP result:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
