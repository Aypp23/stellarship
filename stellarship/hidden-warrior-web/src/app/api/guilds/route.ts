import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NODE_ENV === 'production'
  ? (process.env.NEXT_PUBLIC_API_URL || 'https://api.hiddenwarrior.fun/api')
  : 'http://localhost:3001/api';

// Helper function to transform snake_case to camelCase
function transformKeysToCamelCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(transformKeysToCamelCase);

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Preserve keys like _count, _sum etc.
    if (key.startsWith('_')) {
      result[key] = transformKeysToCamelCase(value);
      continue;
    }
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = transformKeysToCamelCase(value);
  }
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();

    const response = await fetch(`${BACKEND_URL}/guilds${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    // Transform snake_case keys to camelCase for frontend
    const transformedData = transformKeysToCamelCase(data);
    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Guild GET API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/guilds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    // Transform snake_case keys to camelCase for frontend
    const transformedData = transformKeysToCamelCase(data);
    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Guild POST API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
