import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

export interface AuthResult {
  userId: string;
  user: any;
  isValid: boolean;
  error?: string;
}

/**
 * Validates Clerk JWT token and returns user information
 * @param req NextRequest object
 * @returns AuthResult with user data or error
 */
export async function validateJWT(req: NextRequest): Promise<AuthResult | NextResponse> {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ 
        error: 'Unauthorized - Invalid or missing JWT token' 
      }, { status: 401 });
    }

    return {
      userId,
      user,
      isValid: true
    };
  } catch (error) {
    console.error('[JWT_VALIDATION_ERROR]', error);
    return NextResponse.json({ 
      error: 'Token validation failed' 
    }, { status: 401 });
  }
}

/**
 * Validates JWT and returns user ID only
 * @param req NextRequest object
 * @returns string | NextResponse
 */
export async function getUserId(req: NextRequest): Promise<string | NextResponse> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ 
        error: 'Unauthorized - Invalid or missing JWT token' 
      }, { status: 401 });
    }

    return userId;
  } catch (error) {
    console.error('[GET_USER_ID_ERROR]', error);
    return NextResponse.json({ 
      error: 'Token validation failed' 
    }, { status: 401 });
  }
}

/**
 * Validates JWT and returns full user object
 * @param req NextRequest object
 * @returns any | NextResponse
 */
export async function getCurrentUser(req: NextRequest): Promise<any | NextResponse> {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ 
        error: 'Unauthorized - Invalid or missing JWT token' 
      }, { status: 401 });
    }

    return user;
  } catch (error) {
    console.error('[GET_CURRENT_USER_ERROR]', error);
    return NextResponse.json({ 
      error: 'Token validation failed' 
    }, { status: 401 });
  }
}

/**
 * Middleware wrapper for API routes that require authentication
 * @param handler API route handler function
 * @returns Wrapped handler with authentication
 */
export function withAuth(handler: (req: NextRequest, authResult: AuthResult) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const authResult = await validateJWT(req);
    
    // If authResult is a NextResponse, it means authentication failed
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // If authResult is not valid, return error
    if (!authResult.isValid) {
      return NextResponse.json({ 
        error: authResult.error || 'Authentication failed' 
      }, { status: 401 });
    }

    // Call the original handler with auth result
    return handler(req, authResult);
  };
}

