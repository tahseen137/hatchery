import type { Metadata } from "next";
import Header from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hatchery — Distribution Intelligence for Indie Founders",
  description:
    "Platform-specific playbooks for indie founders. Know exactly where to go and what to do — on Reddit, Product Hunt, Chrome Web Store, and beyond.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#0D1117] text-white antialiased">
        <Header />
        {children}
      </body>
    </html>
  );
}
