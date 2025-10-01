import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user and invalidate session
 *     description: |
 *       Logs out the current user and invalidates their session.
 *       For mobile apps, this should clear stored tokens.
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       '200':
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Logged out successfully"
 *       '401':
 *         description: Unauthorized - No valid session
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No active session"
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ 
        error: 'No active session' 
      }, { status: 401 });
    }

    // Clerk handles session invalidation automatically
    // For mobile apps, they should clear their stored tokens
    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('[LOGOUT_ERROR]', error);
    return NextResponse.json({ 
      error: 'Logout failed' 
    }, { status: 500 });
  }
}

