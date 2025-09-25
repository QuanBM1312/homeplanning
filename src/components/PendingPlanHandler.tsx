"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
// BỎ: import { createPlanFromOnboarding } from "@/actions/createPlanFromOnboarding";
import LoadingOverlay from "./ui/loading-overlay";

const PENDING_PLAN_KEY = "pendingOnboardingPlan";

export default function PendingPlanHandler() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(true);
  const [message, setMessage] = useState("Kiểm tra dữ liệu của bạn...");

  useEffect(() => {
    const processPendingPlan = async () => {
      const pendingPlanJSON = localStorage.getItem(PENDING_PLAN_KEY);

      if (!pendingPlanJSON) {
        setIsProcessing(false);
        return;
      }

      setMessage("Đang tạo kế hoạch của bạn...");
      try {
        const pendingPlanData = JSON.parse(pendingPlanJSON);

        // THAY THẾ SERVER ACTION BẰNG API CALL
        const response = await fetch('/api/onboarding/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(pendingPlanData),
        });

        localStorage.removeItem(PENDING_PLAN_KEY);

        if (response.ok) {
            const result = await response.json();
            // Redirect to the new results page
            router.push(`/plan/${result.planId}/results`);
        } else {
            const errorResult = await response.json();
            // If creation fails, log the error and go to the general dashboard
            console.error(
              "Failed to create plan from onboarding data via API:",
              errorResult.errors || errorResult.error
            );
            router.push("/dashboard");
        }

      } catch (error) {
        // Catch any other errors, clear storage, and redirect
        console.error("Error processing pending plan:", error);
        localStorage.removeItem(PENDING_PLAN_KEY); // Dọn dẹp nếu có lỗi
        router.push("/dashboard");
      }
    };
    processPendingPlan();
  }, [router]);

  if (isProcessing) {
    return <LoadingOverlay messages={[message]} />;
  }

  return null;
}
