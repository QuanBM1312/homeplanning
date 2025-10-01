import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import logger from '@/lib/logger';
import { runProjectionWithEngine } from '@/actions/projectionHelpers';

/**
 * @swagger
 * /plans/{planId}/projection:
 *   post:
 *     summary: Recalculate financial projection
 *     description: |
 *       Triggers a full recalculation of the financial projection for a given plan.
 *       This should be called after any significant changes to the plan's assumptions (e.g., income, expenses, growth rates).
 *       The new projection results are saved and returned.
 *     tags: [Plans]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the plan to recalculate.
 *     responses:
 *       '201':
 *         description: Projection recalculated and returned successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: The full projection cache object.
 *       '401':
 *         description: Unauthorized.
 *       '404':
 *         description: Plan not found or user does not have permission.
 *       '500':
 *         description: Internal Server Error.
 */
export async function POST(
  req: Request,
  { params }: { params: { planId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { planId } = params;

    const plan = await db.plan.findFirst({
      where: { id: planId, userId },
    });

    if (!plan) {
      return new NextResponse('Plan not found or you do not have permission', { status: 404 });
    }

    logger.info(`[PROJECTION_POST] Starting projection for planId: ${planId}`, { userId });

    const projectionCache = await runProjectionWithEngine(planId);

    logger.info(`[PROJECTION_POST] Successfully generated projection for planId: ${planId}`, { userId });
    
    // Trả về kết quả tính toán với status 200 OK (vì không tạo mới tài nguyên)
    return NextResponse.json(projectionCache, { status: 200 });

  } catch (error) {
    logger.error(`[PROJECTION_POST] Error for planId: ${params.planId}`, { error: String(error) });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

