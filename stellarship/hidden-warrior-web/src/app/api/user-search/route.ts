import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NODE_ENV === 'production'
  ? (process.env.NEXT_PUBLIC_API_URL || 'https://api.hiddenwarrior.fun/api')
  : 'http://localhost:3001/api';

// Simple cache to avoid too many requests to backend
const userSearchCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

// Helper function to transform snake_case to camelCase
function transformKeysToCamelCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(transformKeysToCamelCase);

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = transformKeysToCamelCase(value);
  }
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    // Check cache first
    const cacheKey = walletAddress;
    const cached = userSearchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('Returning cached user search result for:', walletAddress);
      return NextResponse.json(cached.data);
    }

    console.log('Fetching user search for wallet:', walletAddress);

    // Try without auth first (as in original app)
    let response = await fetch(`${BACKEND_URL}/users/search?walletAddress=${encodeURIComponent(walletAddress)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // If that fails, try with auth
    if (!response.ok) {
      console.log('Trying with auth header');
      response = await fetch(`${BACKEND_URL}/users/search?walletAddress=${encodeURIComponent(walletAddress)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': request.headers.get('Authorization') || '',
        },
      });
    }

    if (!response.ok) {
      // Log the error for debugging
      console.error(`Backend API error: ${response.status} ${response.statusText}`);
      try {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        // Don't cache error responses
        return NextResponse.json(errorData, { status: response.status });
      } catch (parseError) {
        return NextResponse.json(
          { error: `Backend API error: ${response.status} ${response.statusText}` },
          { status: response.status }
        );
      }
    }

    const data = await response.json();

    // If no user found (empty response), return empty object but don't cache it
    if (!data || (Array.isArray(data) && data.length === 0) || (data && Object.keys(data).length === 0)) {
      console.log('No user found for wallet:', walletAddress);
      return NextResponse.json({});
    }

    // If data is null or undefined, return empty object
    if (data === null || data === undefined) {
      console.log('Backend returned null/undefined for wallet:', walletAddress);
      return NextResponse.json({});
    }

    // Transform snake_case keys to camelCase for frontend
    const transformedData = transformKeysToCamelCase(data);

    // Cache the successful response
    userSearchCache.set(cacheKey, {
      data: transformedData,
      timestamp: Date.now()
    });

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('User Search API Error:', error);
    // Return empty object instead of error to not break the UI
    return NextResponse.json({});
  }
}
