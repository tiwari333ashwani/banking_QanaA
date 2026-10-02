import type { Metadata } from "next";
import "@/styles/globals.css";
import { TopNav } from "@/components/navigation/TopNav";

export const metadata: Metadata = {
  title: "Daily Q&A Banking Platform | SBI PO Simulation",
  description: "Stateless, zero-cache utility platform for SBI PO and Banking Exam preparation with PDF Q&A extraction and authentic TCS iON test simulation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <TopNav />
        <main>{children}</main>
      </body>
    </html>
  );
}
