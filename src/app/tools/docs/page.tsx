import { Suspense } from "react";
import DocsPageClient from "./DocsPageClient";

function LoadingShell() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-amber-400 text-lg animate-pulse">Loading…</div>
    </div>
  );
}

export default function DocsPage() {
  return (
    <Suspense fallback={<LoadingShell />}>
      <DocsPageClient />
    </Suspense>
  );
}
