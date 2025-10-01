import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh JWT token for mobile app
 *     description: |
 *       Refreshes the JWT token for mobile applications.
 *       Clerk handles token refresh automatically, this endpoint
 *       validates the current session and returns updated user info.
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       '200':
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 userId:
 *                   type: string
 *                   description: Clerk user ID
 *                 email:
 *                   type: string
 *                   description: User's email address
 *                 firstName:
 *                   type: string
 *                   description: User's first name
 *                 lastName:
 *                   type: string
 *                   description: User's last name
 *       '401':
 *         description: Unauthorized - Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Token refresh failed"
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ 
        error: 'Token refresh failed' 
      }, { status: 401 });
    }

    // Clerk automatically handles token refresh
    // We just need to return updated user information
    return NextResponse.json({
      success: true,
      userId: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      firstName: user.firstName,
      lastName: user.lastName,
      // Token is automatically refreshed by Clerk
    });

  } catch (error) {
    console.error('[TOKEN_REFRESH_ERROR]', error);
    return NextResponse.json({ 
      error: 'Token refresh failed' 
    }, { status: 500 });
  }
}

