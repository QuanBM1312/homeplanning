import { db } from "@/lib/db";
import { runProjectionWithEngine } from "@/actions/projectionHelpers";
import logger from "@/lib/logger";
import { Prisma } from "@prisma/client";
import { createOnboardingProgress } from "@/actions/onboardingActions";

// Dùng lại schema từ API route hoặc định nghĩa chung ở đây
// Để đơn giản, ta sẽ nhận data đã được validate và chuẩn hóa
export type QuickCheckOnboardingData = {
  yearsToPurchase: number; // Đã được chuyển đổi
  targetHousePriceN0: number; // Đã được chuyển đổi
  monthlyLivingExpenses: number;
  hasCoApplicant?: boolean;
  initialSavings?: number;
  userMonthlyIncome?: number;
  targetHouseType?: string;
  targetLocation?: string;
};

/**
 * Service để bắt đầu luồng onboarding: tạo plan mới từ dữ liệu QuickCheck.
 * Mặc định sẽ xóa plan cũ nếu tồn tại.
 *
 * @param userId - ID của người dùng
 * @param userEmail - Email của người dùng
 * @param data - Dữ liệu đã được validate và chuẩn hóa từ QuickCheck
 * @returns { a new plan object }
 */
export async function startOnboardingPlan(
  userId: string,
  userEmail: string | undefined,
  data: QuickCheckOnboardingData
) {
  // --- 1. Thực hiện chiến lược "replace" ---
  const existingPlan = await db.plan.findFirst({ where: { userId } });

  if (existingPlan) {
    // Xóa plan cũ và tất cả dữ liệu liên quan
    await db.$transaction([
      db.planFamilySupport.deleteMany({ where: { planId: existingPlan.id } }),
      db.planReport.deleteMany({ where: { planId: existingPlan.id } }),
      db.milestoneProgress.deleteMany({ where: { planId: existingPlan.id } }),
      db.planRoadmap.deleteMany({ where: { planId: existingPlan.id } }),
      db.onboardingProgress.deleteMany({ where: { planId: existingPlan.id } }),
      db.planHistory.deleteMany({ where: { planId: existingPlan.id } }),
      db.plan.delete({ where: { id: existingPlan.id } })
    ]);
    logger.info("Service: Replaced existing plan for user", { userId, oldPlanId: existingPlan.id });
  }

  // --- 2. Tạo plan mới ---
  const newPlan = await db.plan.create({
    data: {
      ...data,
      userId,
      userEmail,
      confirmedPurchaseYear: data.yearsToPurchase + new Date().getFullYear(),
      planName: "Kế hoạch mua nhà đầu tiên",
      // Các giá trị mặc định cho các bước sau
      pctSalaryGrowth: 7.0,
      pctHouseGrowth: 10.0,
      pctExpenseGrowth: 4.0,
      pctInvestmentReturn: 11.0,
      loanInterestRate: 11.0,
      loanTermYears: 25,
      paymentMethod: "BankLoan",
    },
  });


  await createOnboardingProgress(newPlan.id);

  // --- 3. Seed dữ liệu liên quan ---
  await db.planFamilySupport.create({
    data: { planId: newPlan.id },
  });

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


  logger.info("Service: Successfully created new plan from QuickCheck", { userId, planId: newPlan.id });

  return finalPlan;
}
