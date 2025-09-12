"use client";

import { useState, useEffect } from "react";
import { OnboardingPlanState } from "../types";
import MultiStepQuestionForm, {
  Question,
} from "../shared/MultiStepQuestionForm";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import LoadingStep from "../shared/LoadingStep";
import ResultStep from "../shared/ResultStep";
import { updateSpendingAndRecalculate } from "@/actions/updateSpendingAndRecalculate";
import { RecalculationResult } from "../shared/ResultStep";
import { useDebounce } from "@/hooks/useDebounce";
import { completeOnboardingSection, updateOnboardingSectionProgress } from "@/actions/onboardingActions";


interface SpendingProps {
  initialData: Partial<OnboardingPlanState>;
  plan: OnboardingPlanState;
  planId: string;
  onCompleted: (data: Partial<OnboardingPlanState>) => void;
}

type Step = "intro" | "form" | "loading" | "result";

export default function Spending({
  initialData,
  plan,
  planId,
  onCompleted,
}: SpendingProps) {
  const [step, setStep] = useState<Step>("intro");
  const [result, setResult] = useState<RecalculationResult | null>(null);
  const [formState, setFormState] = useState<{
    formData: Partial<OnboardingPlanState>;
    touchedFields: Record<string, boolean>;
  }>({ formData: {}, touchedFields: {} });
  const router = useRouter();

  // Debounce form state to avoid excessive server calls
  const debouncedFormState = useDebounce(formState, 500);

  // Effect to update progress when debounced form state changes
  useEffect(() => {
    if (debouncedFormState && Object.keys(debouncedFormState.touchedFields).length > 0) {
      console.log("Updating spending section with:", debouncedFormState);
      updateOnboardingSectionProgress(plan.id, "spending", debouncedFormState.formData, debouncedFormState.touchedFields);
    }
  }, [debouncedFormState, plan.id]);

  const spendingQuestions: Question[] = [
    { key: 'monthlyNonHousingDebt', text: 'Số tiền bạn đang trả cho các khoản vay hàng tháng khác?', type: 'number', unit: 'triệu VNĐ' },
    // @ts-ignore
    { key: 'currentAnnualInsurancePremium', text: 'Chi phí bạn đang trả cho bảo hiểm nhân thọ hàng năm là bao nhiêu?', type: 'number', unit: 'triệu VNĐ' },
    { 
      key: 'currentAnnualOtherExpenses', 
      text: 'Chi tiêu của cả GIA ĐÌNH hàng tháng là bao nhiêu (trừ chi tiêu CÁ NHÂN)?', 
      type: 'number', 
      unit: 'triệu VNĐ',  
      condition: () => plan.hasFamilySupport === true
    },
  ];

  const handleContinue = () => {
    completeOnboardingSection(planId, "spending");
    router.push(`/plan/${planId}/assumption`);
  }

  const defaultValues: Partial<OnboardingPlanState> = {
    monthlyNonHousingDebt: plan.monthlyNonHousingDebt,
    currentAnnualInsurancePremium: plan.currentAnnualInsurancePremium,
    currentAnnualOtherExpenses: plan.currentAnnualOtherExpenses,
  };

  const handleSubmit = async (formData: Partial<OnboardingPlanState>) => {
    setStep("loading");
    const fullData = { ...initialData, ...formData };

    const spendingPayload = {
      monthlyNonHousingDebt: fullData.monthlyNonHousingDebt,
      currentAnnualInsurancePremium: fullData.currentAnnualInsurancePremium,
      currentAnnualOtherExpenses: fullData.currentAnnualOtherExpenses,
    };

    const result = await updateSpendingAndRecalculate(plan, spendingPayload);
    
    if (result.success) {
      setResult(result as RecalculationResult);
      setStep("result");
    } else {
      toast.error(result.error || "Có lỗi xảy ra, vui lòng thử lại.");
      setStep("form"); // Go back to form on error
    }
  };

  if (step === "intro") {
    return (
      <>
        <div
          className="max-w-5xl mx-auto fixed inset-0 bg-cover bg-center z-0"
          style={{ backgroundImage: "url('/onboarding/section3bg.png')" }}
        />
        <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col p-8 z-10">
          <div className="flex-grow flex flex-col items-center justify-center text-center">
            <div className="text-white/80 font-semibold mb-8">
                Mục 2/3
            </div>
            <Image
              src="/icons/suitcase 3.png"
              alt="Dòng tiền đi ra"
              width={80}
              height={80}
              className="mb-6"
            />
            <h1 className="text-4xl max-md:text-3xl font-bold text-white mb-3">
                Dòng tiền đi ra
            </h1>
            <p className="text-lg text-white/90 max-w-sm">
                Ngồi vững ghế nhé, có thể năm mua nhà sớm nhất của bạn sẽ bị đẩy lùi đi đó!            
            </p>
          </div>
          <Button
            onClick={() => setStep("form")}
            className="w-full bg-white text-slate-900 hover:bg-slate-200 py-4 text-lg font-semibold rounded-sm shadow-lg transition-transform transform active:scale-95"
          >
            Tôi sẵn sàng rồi
          </Button>
        </div>
      </>
    );
  }

  if (step === "loading") {
      return (
        <div className="max-w-5xl mx-auto fixed inset-0 pt-2 flex flex-col z-10 bg-slate-950">
            <LoadingStep title="Dòng tiền đi ra" message="Tính toán các dòng tiền đi ra" percentage={100}/>
        </div>
      )
  }

  if (step === "result" && result) {
      return <ResultStep 
        plan={result.plan}
        title="Dòng tiền đi ra "
        message={result.message}
        earliestPurchaseYear={result.earliestPurchaseYear}
        onContinue={handleContinue}
        hasWorsened={result.hasWorsened} // 🔥 Pass prop này để ResultStep biết cách hiển thị
      />
  }

  return (
    <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col py-4 z-10 bg-slate-950">
        <MultiStepQuestionForm 
            questions={spendingQuestions} 
            onSubmit={handleSubmit}
            title="Dòng tiền đi ra"
            subtitle="Thời gian mua nhà có ảnh hưởng không"
            defaultValues={defaultValues}
            onDataChange={setFormState}
        />
    </div>
  );
}
