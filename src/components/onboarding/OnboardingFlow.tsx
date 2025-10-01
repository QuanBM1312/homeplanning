"use client";

import { useState } from "react";
import { OnboardingPlanState } from "./types";
import QuickCheck from "./sections/QuickCheck";
import SignupPrompt from "./sections/SignupPrompt";
import FamilySupport from "./sections/FamilySupport";
import Spending from "./sections/Spending";
import Assumption from "./sections/Assumption";
import { Plan } from "@prisma/client";
import { useUser } from "@clerk/nextjs";
import LoadingOverlay from "../ui/loading-overlay";

type OnboardingSection = 'quickCheck' | 'signupPrompt' | 'familySupport' | 'spending' | 'assumptions';
type SectionName = "familysupport" | "spending" | "assumptions";

interface OnboardingFlowProps {
  planId: string;
}

// Helper function to call our unified section API
async function updatePlanSection(planId: string, section: SectionName, data: any) {
  const response = await fetch(`/api/plans/${planId}/section`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section, data }),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(errorBody.error || `Failed to update section ${section}`);
  }

  return response.json();
}

export default function OnboardingFlow({ planId }: OnboardingFlowProps) {
  const [currentSection, setCurrentSection] = useState<OnboardingSection>('quickCheck');
  const [planState, setPlanState] = useState<Partial<OnboardingPlanState>>({});
  const { isSignedIn } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuickCheckCompleted = (data: Partial<OnboardingPlanState>) => {
    setPlanState(prev => ({ ...prev, ...data }));
    if (isSignedIn) {
      setCurrentSection('familySupport');
    } else {
      setCurrentSection('signupPrompt');
    }
  };

  const handleFamilySupportCompleted = async (data: Partial<OnboardingPlanState>) => {
    setIsLoading(true);
    setError(null);
    try {
      await updatePlanSection(planId, 'familysupport', data);
      setPlanState(prev => ({ ...prev, ...data }));
      setCurrentSection('spending');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpendingCompleted = async (data: Partial<OnboardingPlanState>) => {
    setIsLoading(true);
    setError(null);
    try {
      await updatePlanSection(planId, 'spending', data);
      setPlanState(prev => ({ ...prev, ...data }));
      setCurrentSection('assumptions');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackFromPrompt = () => {
    setCurrentSection('quickCheck');
  };
  
  const renderSection = () => {
    switch (currentSection) {
      case 'quickCheck':
        return <QuickCheck onCompleted={handleQuickCheckCompleted} />;
      case 'signupPrompt':
        return <SignupPrompt planData={planState} onBack={handleBackFromPrompt} />;
      case 'familySupport':
        return <FamilySupport initialData={planState} familySupport={planState} planId={planId} onSubmit={handleFamilySupportCompleted} />;
      case 'spending':
        return <Spending initialData={planState} plan={planState} onCompleted={handleSpendingCompleted} planId={planId} isEditMode={false}/>;
      case 'assumptions':
        return <Assumption plan={planState as Plan} onFinalChoice={() => {}} onConfirm={() => {}} step="intro" setStep={() => {}} assumptionStep={0} onNext={() => {}} onPrev={() => {}} result={null} assumptions={{pctSalaryGrowth: 0, pctHouseGrowth: 0, pctInvestmentReturn: 0}} onSliderChange={() => {}} chartData={[]}/>;
      default:
        return <QuickCheck onCompleted={handleQuickCheckCompleted} />;
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-slate-950 text-white p-4 sm:p-6">
      {isLoading && <LoadingOverlay messages={['Đang lưu dữ liệu...']} />}
      {error && <div className="text-red-500 bg-red-900/50 p-4 rounded-md mb-4">{`Lỗi: ${error}`}</div>}
      
      <div className="w-full max-w-5xl flex flex-col h-full flex-1">
        {renderSection()}
      </div>
    </div>
  );
}
