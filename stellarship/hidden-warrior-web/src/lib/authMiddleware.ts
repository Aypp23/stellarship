import { NextRequest } from 'next/server';

export interface AuthResult {
  success: boolean;
  message?: string;
  token?: string;
  user?: {
    id: number;
    walletAddress: string;
  };
}

export async function authMiddleware(request: NextRequest): Promise<AuthResult> {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        message: 'Authentication required'
      };
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return {
        success: false,
        message: 'Invalid token'
      };
    }

    // In a real implementation, you would verify the JWT token here
    // For now, we'll pass it through to the backend
    return {
      success: true,
      token: token
    };
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    return {
      success: false,
      message: 'Authentication failed'
    };
  }
}
