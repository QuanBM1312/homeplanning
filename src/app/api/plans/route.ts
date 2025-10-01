import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import logger from "@/lib/logger";
import { startOnboardingPlan } from "@/lib/services/onboardingService";
import { db } from "@/lib/db";
import { planSchema } from "@/lib/validators/plan";

/**
 * @swagger
 * /plans:
 *   post:
 *     summary: Create a new comprehensive plan
 *     description: |
 *       Creates a new financial plan from scratch. 
 *       This endpoint can accept a full payload with all details, including nested sections like family support. 
 *       If the user already has a plan, it will be replaced.
 *     tags: [Plans]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Plan'
 *     responses:
 *       '201':
 *         description: New plan created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 planId:
 *                   type: string
 *                   description: The ID of the newly created plan.
 *       '400': { description: "Invalid request body." }
 *       '401': { description: "Unauthorized." }
 *       '500': { description: "Internal Server Error." }
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    const clerkUser = await currentUser();
    if (!userId || !clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    // Use the new, comprehensive schema for creation
    const data = planSchema.parse(body);

    const {
      yearsToPurchase: absoluteYear,
      targetHousePriceN0: priceInBillion,
      ...restData
    } = data;

    // Chuẩn hóa dữ liệu trước khi gọi service
    const yearsToPurchase = absoluteYear - new Date().getFullYear();
    if (yearsToPurchase < 0) {
        return NextResponse.json({ error: "Năm mục tiêu phải là năm hiện tại hoặc trong tương lai" }, { status: 400 });
    }
    const targetHousePriceN0 = priceInBillion * 1000;

    const userEmail = clerkUser.emailAddresses[0]?.emailAddress;

    const normalizedData = {
        ...restData,
        yearsToPurchase,
        targetHousePriceN0,
    };

    // Gọi service để xử lý logic - service này sẽ cần được nâng cấp
    const newPlan = await startOnboardingPlan(userId, userEmail, normalizedData);

    return NextResponse.json({ planId: newPlan.id }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn("Invalid data for plan creation via /api/plans", { errors: error.format() });
      return NextResponse.json({ errors: error.format() }, { status: 400 });
    }
    logger.error("Failed to create plan from /api/plans", { error: String(error) });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * @swagger
 * /plans:
 *   get:
 *     summary: Get all plans for the current user
 *     description: Retrieves a list of all financial plans associated with the currently authenticated user.
 *     tags: [Plans]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       '200':
 *         description: A list of plans.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Plan'
 *       '401': { description: "Unauthorized." }
 *       '500': { description: "Internal Server Error." }
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get all plans for the current user
    const plans = await db.plan.findMany({
      where: {
        userId,
      },
      include: {
        familySupport: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error("[PLANS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
