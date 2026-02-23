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
    const response = await fetch(`${BACKEND_URL}/guilds/me/guild`, {
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

    // If no guild found, return empty array
    if (!data) {
      return NextResponse.json({ guilds: [] });
    }

    // Transform snake_case keys to camelCase for frontend
    const transformedData = transformKeysToCamelCase(data);

    // If it's a single guild object, wrap it in array
    if (transformedData && !Array.isArray(transformedData) && !transformedData.guilds) {
      return NextResponse.json({ guilds: [transformedData] });
    }

    // If it's already an array of guilds, return as is
    if (Array.isArray(transformedData)) {
      return NextResponse.json({ guilds: transformedData });
    }

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('User Guilds API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

