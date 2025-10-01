import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { calculateAffordability } from "@/lib/calculations/affordability";
import logger from "@/lib/logger";
import { planSchema } from "@/lib/validators/plan";

export async function GET(
  req: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const { userId } = await auth();
    const { planId } = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const plan = await db.plan.findUnique({
      where: {
        id: planId,
        userId,
      },
      include: {
        familySupport: true,
      },
    });

    if (!plan) {
      return new NextResponse("Plan not found", { status: 404 });
    }

    // Calculate affordability
    const affordabilityResult = calculateAffordability(plan);

    return NextResponse.json({
      plan,
      affordabilityResult,
    });
  } catch (error) {
    logger.error("[PLAN_GET]", { error: String(error) });
    return new NextResponse("Internal Error", { status: 500 });
  }
}
/**
 * @swagger
 * /plans/{planId}:
 *   put:
 *     summary: Update a plan
 *     description: Updates one or more properties of a plan and its related sections like family support.
 *     tags: [Plans]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema: { type: string }
 *         description: The ID of the plan to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               planName:
 *                 type: string
 *               userMonthlyIncome:
 *                 type: number
 *               pctSalaryGrowth:
 *                 type: number
 *               familySupport:
 *                 type: object
 *                 properties:
 *                   hasFamilySupport:
 *                     type: boolean
 *                   familySupportAmount:
 *                     type: number
 *             example:
 *               planName: "My Updated Home Plan"
 *               userMonthlyIncome: 5500
 *               pctSalaryGrowth: 5.5
 *               familySupport:
 *                 hasFamilySupport: true
 *                 familySupportAmount: 10000
 *     responses:
 *       '200':
 *         description: Plan updated successfully.
 *       '400': { description: "Invalid request body." }
 *       '401': { description: "Unauthorized." }
 *       '404': { description: "Plan not found." }
 *       '500': { description: "Internal Server Error." }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const { userId } = await auth();
    const { planId } = await params;
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

     const body = await req.json();
     const validation = planSchema.safeParse(body);
     if (!validation.success) {
         return NextResponse.json({ errors: validation.error.format() }, { status: 400 });
     }
    const { familySupport, ...planData } = validation.data;

   const updatedPlan = await db.plan.update({
     where: { id: planId, userId }, // Ensure user owns the plan
     data: {
       ...planData,
       ...(familySupport && {
         familySupport: {
           update: familySupport,
         },
       }),
     } as any,
     include: {
       familySupport: true, // Vẫn include để trả về dữ liệu đầy đủ
     },
   });

     return NextResponse.json(updatedPlan);
    } catch (error) {
    logger.error("[PLAN_PUT]", { error: String(error) });
      return new NextResponse("Internal Error", { status: 500 });
    }
  }

/**
 * @swagger
 * /plans/{planId}:
 *   delete:
 *     summary: Delete a plan
 *     description: Permanently deletes a specific financial plan. This action cannot be undone.
 *     tags: [Plans]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema: { type: string }
 *         description: The ID of the plan to delete.
 *     responses:
 *       '204':
 *         description: Plan deleted successfully. No content.
 *       '401': { description: "Unauthorized." }
 *       '404': { description: "Plan not found." }
 *       '500': { description: "Internal Server Error." }
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const { userId } = await auth();
    const { planId } = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const plan = await db.plan.findUnique({
      where: {
        id: planId,
        userId,
      },
      include: {
        familySupport: true,
      },
    });

    if (!plan) {
      return new NextResponse("Plan not found", { status: 404 });
    }

    // Delete the plan
    await db.plan.delete({
      where: {
        id: planId,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error("[PLAN_DELETE]", { error: String(error) });
    return new NextResponse("Internal Error", { status: 500 });
  }
}
