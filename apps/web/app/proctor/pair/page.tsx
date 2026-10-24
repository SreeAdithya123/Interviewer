import { Suspense } from "react";
import { DualCamMobileClient } from "./DualCamMobileClient";

export const metadata = {
  title: "Secondary Camera Proctor | Vyoman",
  description: "Mobile companion proctoring client for 45-degree angle desk monitoring.",
};

export default function ProctorPairPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white text-xs">
          Loading camera proctor...
        </div>
      }
    >
      <DualCamMobileClient />
    </Suspense>
  );
}
