import { Suspense } from "react";
import PlanPageClient from "./PlanPageClient";

function LoadingShell() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-amber-400 text-lg animate-pulse">Generating your plan...</div>
    </div>
  );
}

export default function PlanPage() {
  return (
    <Suspense fallback={<LoadingShell />}>
      <PlanPageClient />
    </Suspense>
  );
}
