import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/authMiddleware';

const BACKEND_URL = process.env.NODE_ENV === 'production' 
  ? (process.env.NEXT_PUBLIC_API_URL || 'https://api.hiddenwarrior.fun/api')
  : 'http://localhost:3001/api';

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    // Apply auth middleware to get user token
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json({ message: authResult.message }, { status: 401 });
    }

    // Get optional state parameter
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');

    console.log('🔵 [Discord Auth] Getting auth URL from backend');

    // DON'T pass redirect_uri - let backend use its own callback endpoint!
    // Backend will handle the callback itself and close the popup
    const backendUrl = new URL(`${BACKEND_URL}/discord/auth`);
    if (state) {
      backendUrl.searchParams.set('state', state);
    }

    console.log('🔵 [Discord Auth] Requesting backend URL:', backendUrl.toString());

    // Forward request to backend with user's auth token
    const backendResponse = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authResult.token}`,
      },
    });

    const data = await backendResponse.json();
    console.log('🔵 [Discord Auth] Backend response:', data);

    if (!backendResponse.ok) {
      console.error('🔴 [Discord Auth] Backend error:', backendResponse.status, data);
      return NextResponse.json(
        { message: data.message || 'Failed to get Discord auth URL' },
        { status: backendResponse.status }
      );
    }

    // Log the actual auth URL to see what redirect_uri it contains
    if (data.authUrl) {
      const authUrlObj = new URL(data.authUrl);
      console.log('🔵 [Discord Auth] Auth URL redirect_uri:', authUrlObj.searchParams.get('redirect_uri'));
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Discord auth API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

