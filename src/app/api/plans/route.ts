import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import logger from "@/lib/logger";
import { startOnboardingPlan } from "@/lib/services/onboardingService";
import { db } from "@/lib/db";

// Schema validation cho dữ liệu từ QuickCheck
const quickCheckCreateSchema = z.object({
  yearsToPurchase: z.number().int().min(new Date().getFullYear(), "Năm mục tiêu không hợp lệ"),
  targetHousePriceN0: z.number().positive("Giá nhà mục tiêu phải là số dương"),
  monthlyLivingExpenses: z.number().nonnegative("Chi phí sinh hoạt không được âm"),
  hasCoApplicant: z.boolean().optional(),
  initialSavings: z.number().nonnegative("Tiết kiệm ban đầu không được âm").optional(),
  userMonthlyIncome: z.number().nonnegative("Thu nhập hàng tháng không được âm").optional(),
  targetHouseType: z.string().optional(),
  targetLocation: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    const clerkUser = await currentUser();
    if (!userId || !clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = quickCheckCreateSchema.parse(body);

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

    // Gọi service để xử lý logic
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
