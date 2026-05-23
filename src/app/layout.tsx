import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ivoice 司会君 ダッシュボード",
  description: "SPO予定表と連動してTeams会議を自動司会するダッシュボード",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
