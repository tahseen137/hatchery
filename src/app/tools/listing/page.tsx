import { Suspense } from "react";
import ListingPageClient from "./ListingPageClient";

function LoadingShell() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-amber-400 text-lg animate-pulse">Loading…</div>
    </div>
  );
}

export default function ListingPage() {
  return (
    <Suspense fallback={<LoadingShell />}>
      <ListingPageClient />
    </Suspense>
  );
}
