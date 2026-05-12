import type { Metadata } from "next";
import Header from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hatchery — Distribution Intelligence for Indie Founders",
  description:
    "Hatchery gives indie founders a platform-specific 30-day launch playbook. Know exactly where to go and what to do.",
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
