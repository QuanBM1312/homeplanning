import { db } from "@/lib/db";
import logger from "@/lib/logger";
import { runProjectionWithEngine } from "@/actions/projectionHelpers";
import { createOnboardingProgress } from "@/actions/onboardingActions";
import { z } from "zod";
import { planSchema } from "@/lib/validators/plan";

// Define the type based on the Zod schema for type safety
export type FullPlanOnboardingData = z.infer<typeof planSchema>;

/**
 * Service để bắt đầu luồng onboarding: tạo plan mới từ dữ liệu.
 * Có thể xử lý cả dữ liệu tối thiểu (QuickCheck) hoặc dữ liệu đầy đủ.
 * Mặc định sẽ xóa plan cũ nếu tồn tại.
 *
 * @param userId - ID của người dùng
 * @param userEmail - Email của người dùng
 * @param data - Dữ liệu đã được validate và chuẩn hóa
 * @returns { a new plan object }
 */
export async function startOnboardingPlan(
  userId: string,
  userEmail: string | undefined,
  data: FullPlanOnboardingData
) {
  const { familySupport, ...planData } = data;

  // --- 1. Thực hiện chiến lược "replace" ---
  const existingPlan = await db.plan.findFirst({ where: { userId } });
  if (existingPlan) {
    // Xóa plan cũ và tất cả dữ liệu liên quan
    await db.plan.delete({ where: { id: existingPlan.id }});
    logger.info("Service: Replaced existing plan for user", { userId, oldPlanId: existingPlan.id });
  }

  // --- 2. Tạo plan mới ---
  const newPlan = await db.plan.create({
    data: {
      ...planData,
      userId,
      userEmail,
      confirmedPurchaseYear: planData.yearsToPurchase + new Date().getFullYear(),
      planName: "Kế hoạch mua nhà đầu tiên",
      // Các giá trị mặc định cho các bước sau
      pctSalaryGrowth: 7.0,
      pctHouseGrowth: 10.0,
      pctExpenseGrowth: 4.0,
      pctInvestmentReturn: 11.0,
      loanInterestRate: 11.0,
      loanTermYears: 25,
      paymentMethod: "BankLoan",
      // Sử dụng nested create để tạo familySupport nếu có dữ liệu
      familySupport: {
        create: familySupport ? (familySupport as any) : {},
      },
    },
  });


  await createOnboardingProgress(newPlan.id);

  const projectionCache = await runProjectionWithEngine(newPlan.id);
  await db.planReport.create({
    data: {
      planId: newPlan.id,
      projectionCache: projectionCache as any,
    },
  });
  
  const finalPlan = await db.plan.update({
      where: { id: newPlan.id },
      data: {
          firstViableYear: projectionCache.earliestPurchaseYear
      }
  });


  logger.info("Service: Successfully created new plan", { userId, planId: newPlan.id });

  return finalPlan;
}
