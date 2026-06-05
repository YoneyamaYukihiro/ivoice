# voice-reader 企画書

> 2026-06-05 起案 / `feat/voice-reader-init` ブランチ

## 1. 目的

自分が書いた業務文章を、Azure Neural TTS で自然な日本語で読み上げる。固有名詞の読み間違いを辞書で潰せる。

最終的には **朝会で自分の分身として司会** を務める TTS 司会ツールへ育てる。本企画書はその第 1 段（MVP）の輪郭を定める。

## 2. 北極星（最終ゴール）

朝会で、自分が書いた台本を、自分の代わりに自然な合成音声が読み上げて司会進行する。固有名詞（人名・社内略語）も正しく読める。

## 3. ターゲット

**自分自身（dog-food）**。汎用ユーザー / 社内他者・社外公開は想定しない。スコープ判断の軸は「自分が使うか」。

## 4. 主要な意思決定

| 論点 | 決定 | 理由 |
|------|------|------|
| 声 | 自然な代替声（ボイスクローンしない） | 「自分の声に似せる」までは不要。自然さがあれば分身として機能する |
| TTS エンジン | Azure Speech Neural TTS | 社内 Azure テナント内に閉じる前提なら業務文章を投入して OK |
| 固有名詞学習 | 手動辞書テーブル | 最もシンプルで確実。自動候補抽出は将来 |
| 認証 | なし | 自分しか使わない |
| 既存 ivoice コード | 残置（共存） | URL `/reader` で別アプリとして動かす。気が向いたら最後に削除 |

## 5. MVP 機能スコープ

### 含む

1. **テキスト貼り付けエリア** — 1 つの textarea、長文 OK
2. **「読み上げ」ボタン** — クリックで Azure Speech に送信、音声生成
3. **音声プレーヤー** — 再生 / 停止 / 話速調整（0.8x〜1.5x）
4. **固有名詞辞書（手動）** — 別画面の表。「表記 → よみがな」を 1 行ずつ追加・編集・削除
5. **辞書置換ロジック** — TTS 投入前に文中の表記をマッチさせ、SSML `<sub alias="よみ">` で読みを上書き
6. **声選択** — `ja-JP-NanamiNeural`（女性）/ `ja-JP-KeitaNeural`（男性）など 2〜3 種

### 明示的に含まない（MVP では切る）

- 履歴保存
- mp3 ダウンロード
- 朝会セクション分け
- 自動学習（辞書候補の自動抽出）
- 多言語
- Teams 連携 / 音声配信
- 認証・複数ユーザー

## 6. 技術スタック

| 層 | 採用 | 備考 |
|----|------|------|
| フロント | Next.js 14 (App Router) + TypeScript + Tailwind | ivoice と同じ。`/reader` ルート配下に新規実装 |
| TTS | Azure Speech REST API（Neural TTS） | Next.js API Route 内で叩く。キーはサーバ側で保持 |
| 辞書保存 | `data/dictionary.json` ローカルファイル | 1 ファイルの JSON で十分。DB は不要 |
| 状態管理 | React useState のみ | 規模的にライブラリ不要 |

### 環境変数

```
AZURE_SPEECH_KEY=...
AZURE_SPEECH_REGION=japaneast
```

`.env.local` に置き、Next.js API Route 内で参照する。

### ディレクトリ構成（予定）

```
src/
├── app/
│   └── reader/
│       ├── page.tsx              # メイン画面（textarea + プレーヤー）
│       ├── dictionary/
│       │   └── page.tsx          # 辞書編集画面
│       └── api/
│           └── tts/
│               └── route.ts      # Azure Speech 呼び出し
├── lib/
│   ├── dictionary.ts             # 辞書 CRUD（JSON ファイル）
│   └── ssml.ts                   # 辞書置換 + SSML 組み立て
└── services/
    └── azure-speech.ts           # Azure Speech REST API クライアント
data/
└── dictionary.json               # 辞書本体
```

既存の `src/app/page.tsx`（ivoice 本体）には触らない。

## 7. 北極星に向けた段階

| Phase | 内容 | 主な追加 |
|-------|------|---------|
| **MVP（今）** | 貼って読む + 辞書 | 上記スコープ |
| Phase 2 | 履歴 / mp3 出力 / 段落区切り再生 | 保存先 SQLite 化検討 |
| Phase 3 | 朝会台本モード | 複数セクション、テンプレ、間の取り方制御 |
| Phase 4 | 分身モード | Teams への音声配信（ACS Call Automation 等） |

## 8. 未決事項（MVP 着手前に解消するもの）

- なし。MVP の範囲はこの企画書で確定。

## 9. 着手前のチェックリスト

- [ ] `.env.local` に `AZURE_SPEECH_KEY` / `AZURE_SPEECH_REGION` を設定
- [ ] `data/` ディレクトリを `.gitignore` に追加（辞書を Git に入れない）
- [ ] `docs/voice-reader/PLAN.md`（本ファイル）をコミット
