import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { z } from 'zod';
import { startOnboardingPlan } from '@/lib/services/onboardingService';
import logger from '@/lib/logger';

// Schema này có thể được chia sẻ giữa các file nếu cần
const quickCheckSchema = z.object({
  yearsToPurchase: z.number().int().min(new Date().getFullYear(), "Năm mục tiêu không hợp lệ"),
  targetHousePriceN0: z.number().positive("Giá nhà mục tiêu phải là số dương"),
  monthlyLivingExpenses: z.number().nonnegative("Chi phí sinh hoạt không được âm"),
  hasCoApplicant: z.boolean().optional(),
  initialSavings: z.number().nonnegative("Tiết kiệm ban đầu không được âm").optional(),
  userMonthlyIncome: z.number().nonnegative("Thu nhập hàng tháng không được âm").optional(),
  targetHouseType: z.string().optional(),
  targetLocation: z.string().optional(),
});

/**
 * @swagger
 * /onboarding/start:
 *   post:
 *     summary: Start onboarding and create a new plan
 *     description: |
 *       Creates a new financial plan based on the user's initial QuickCheck data.
 *       If the user already has a plan, this endpoint will **replace** it by default, deleting the old plan and all its associated data.
 *     tags: [Onboarding]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - yearsToPurchase
 *               - targetHousePriceN0
 *               - monthlyLivingExpenses
 *             properties:
 *               yearsToPurchase:
 *                 type: integer
 *                 description: "The absolute year the user plans to purchase the house (e.g., 2027)."
 *                 example: 2028
 *               targetHousePriceN0:
 *                 type: number
 *                 description: "The target house price in billions of VND (e.g., 3.5 for 3.5 tỷ)."
 *                 example: 3.5
 *               monthlyLivingExpenses:
 *                 type: number
 *                 description: "The user's monthly living expenses in millions of VND."
 *                 example: 20
 *               hasCoApplicant:
 *                 type: boolean
 *                 description: "Does the user have a co-applicant?"
 *                 example: false
 *               initialSavings:
 *                 type: number
 *                 description: "Initial savings in millions of VND."
 *                 example: 500
 *               userMonthlyIncome:
 *                 type: number
 *                 description: "User's monthly income in millions of VND."
 *                 example: 40
 *               targetHouseType:
 *                 type: string
 *                 example: "Chung cư"
 *               targetLocation:
 *                 type: string
 *                 example: "Hà Nội"
 *     responses:
 *       '201':
 *         description: Plan created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 planId:
 *                   type: string
 *                   description: The ID of the newly created plan.
 *       '400':
 *         description: Bad Request - Invalid input data.
 *       '401':
 *         description: Unauthorized - JWT token is missing or invalid.
 *       '500':
 *         description: Internal Server Error.
 */
export async function POST(req: Request) {
  try {
    // 1. Xác thực người dùng qua JWT token
    const { userId } = await auth();
    const user = await currentUser();
    if (!userId || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userEmail = user.emailAddresses[0]?.emailAddress;

    // 2. Lấy và validate dữ liệu từ mobile app
    const body = await req.json();
    const validation = quickCheckSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.format() }, { status: 400 });
    }

    const {
        yearsToPurchase: absoluteYear,
        targetHousePriceN0: priceInBillion,
        ...restData
    } = validation.data;

    // 3. Chuẩn hóa dữ liệu
    const yearsToPurchase = absoluteYear - new Date().getFullYear();
    if (yearsToPurchase < 0) {
        return NextResponse.json({ error: "Năm mục tiêu phải là năm hiện tại hoặc trong tương lai" }, { status: 400 });
    }
    const targetHousePriceN0 = priceInBillion * 1000;

    const normalizedData = {
        ...restData,
        yearsToPurchase,
        targetHousePriceN0,
    };

    // 4. Gọi hàm service đã được tái sử dụng
    const result = await startOnboardingPlan(userId, userEmail, normalizedData);

    // 5. Trả kết quả về cho mobile app
    return NextResponse.json({ planId: result.id }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
        logger.warn("Invalid data for plan creation via /api/onboarding/start", { errors: error.format() });
        return NextResponse.json({ errors: error.format() }, { status: 400 });
    }
    logger.error('[API_ONBOARDING_START_ERROR]', { error: String(error) });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
