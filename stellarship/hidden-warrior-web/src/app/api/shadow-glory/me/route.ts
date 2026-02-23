import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/authMiddleware';

const BACKEND_URL = process.env.NODE_ENV === 'production' 
  ? (process.env.NEXT_PUBLIC_API_URL || 'https://api.hiddenwarrior.fun/api')
  : 'http://localhost:3001/api';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.message }, { status: 401 });
    }
    
    const response = await fetch(`${BACKEND_URL}/shadow-glory/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authResult.token}`
      }
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        { error: result.error || 'Failed to get Shadow Glory data' }, 
        { status: response.status }
      );
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error getting Shadow Glory data:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
