import { z } from 'zod';

// This is the single source of truth for plan data structure.
// Used for creation, and for updates.
export const planSchema = z.object({
    // Quick Check Fields
    yearsToPurchase: z.number().int().min(new Date().getFullYear(), "Năm mục tiêu không hợp lệ"),
    targetHousePriceN0: z.number().positive("Giá nhà mục tiêu phải là số dương"),
    monthlyLivingExpenses: z.number().nonnegative("Chi phí sinh hoạt không được âm"),
    hasCoApplicant: z.boolean().optional(),
    initialSavings: z.number().nonnegative("Tiết kiệm ban đầu không được âm").optional(),
    userMonthlyIncome: z.number().nonnegative("Thu nhập hàng tháng không được âm").optional(),
    targetHouseType: z.string().optional(),
    targetLocation: z.string().optional(),

    // Spending Fields (also on Plan model)
    monthlyRent: z.number().nonnegative().optional(),
    monthlyUtilities: z.number().nonnegative().optional(),
    monthlyFood: z.number().nonnegative().optional(),
    monthlyTransport: z.number().nonnegative().optional(),
    monthlyHealthcare: z.number().nonnegative().optional(),
    monthlyPersonal: z.number().nonnegative().optional(),
    monthlyEntertainment: z.number().nonnegative().optional(),
    monthlyOther: z.number().nonnegative().optional(),

    // Assumption Fields (also on Plan model)
    currentAnnualOtherExpenses: z.number().nonnegative().optional(),
    pctSalaryGrowth: z.number().min(0).max(100).optional(),
    pctHouseGrowth: z.number().min(0).max(100).optional(),
    pctExpenseGrowth: z.number().min(0).max(100).optional(),
    pctInvestmentReturn: z.number().min(0).max(100).optional(),
    loanInterestRate: z.number().min(0).max(100).optional(),
    loanTermYears: z.number().int().positive().optional(),
    paymentMethod: z.enum(["Cash", "BankLoan", "FamilySupport"]).optional(),

    // Nested Family Support Section
    familySupport: z.object({
        monthlyOtherIncome: z.number().nonnegative().optional(),
        coApplicantMonthlyIncome: z.number().nonnegative().optional(),
        hasFamilySupport: z.boolean().optional(),
        familySupportType: z.number().optional(),
        familySupportAmount: z.number().nonnegative().optional(),
        familyGiftTiming: z.number().optional(),
        familyLoanRepaymentType: z.number().optional(),
        familyLoanInterestRate: z.number().min(0).max(100).optional(),
        familyLoanTermYears: z.number().int().positive().optional(),
    }).optional(),
});