import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AIボイス司会くん",
  description: "貼り付けたテキストを読み上げる、自分の分身ボイス司会ツール",
};

export default function ReaderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
