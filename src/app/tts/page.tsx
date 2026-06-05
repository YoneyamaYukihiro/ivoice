import Link from "next/link";
import { TextToSpeech } from "@/components/TextToSpeech";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "テキスト読みあげ | ivoice 司会君",
  description: "入力したテキストを Azure Speech で読みあげます",
};

export default function TtsPage() {
  const configured = Boolean(process.env.AZURE_SPEECH_KEY);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            テキスト読みあげツール
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            自由入力したテキストを Neural TTS で音声化します
          </p>
        </div>
        <Link
          href="/"
          className="text-sm text-brand-600 hover:underline"
        >
          ← ダッシュボードへ戻る
        </Link>
      </header>

      {!configured && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Azure Speech が未設定のため、合成リクエストは失敗します。
          <code className="ml-1">.env.local</code> に
          <code className="mx-1">AZURE_SPEECH_KEY</code> を設定してください。
        </div>
      )}

      <TextToSpeech />
    </main>
  );
}
