# ivoice 司会君 ダッシュボード

SharePoint Online (SPO) の予定表と連動して、Teams 会議を自動で司会進行する bot のダッシュボード。

## 概要

- **本日の予定一覧**: SPO / Exchange 予定表から取得した会議を表示
- **司会君コントロール**: bot の Teams 会議参加・退出、自動進行 ON/OFF
- **アジェンダ管理**: 議題ごとの所要時間と担当者を可視化
- **司会台本エディタ**: オープニング / 遷移 / 警告 / クロージングを編集

**Microsoft Graph (SPO/Exchange 予定表)** と **Azure Speech (Neural TTS)** には結線済み。資格情報が `.env.local` にあれば実データ・実音声で動作し、未設定時は自動でモックにフォールバックします。Teams 会議への bot 参加 (ACS Call Automation) は次のステップ。

## 技術スタック

| レイヤ | 技術 |
|--------|------|
| ダッシュボード UI | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| カレンダー連携 | Microsoft Graph API (`/users/{id}/calendarView`) ✅ |
| 音声合成 | Azure AI Speech (Neural TTS, ja-JP-NanamiNeural) ✅ |
| 認証 | Microsoft Entra ID (client credentials, `.default` scope) ✅ |
| Teams 会議参加 (予定) | Azure Communication Services Call Automation |
| ホスティング (予定) | Azure App Service / Azure Functions |

## 開発

```bash
npm install
npm run dev
# http://localhost:3000
```

```bash
npm run typecheck   # 型チェック
npm run lint        # ESLint
npm run build       # 本番ビルド
```

## ディレクトリ

```
src/
├── app/
│   ├── layout.tsx           # ルートレイアウト
│   ├── page.tsx             # ダッシュボードページ
│   └── globals.css          # Tailwind エントリ
├── components/
│   ├── Dashboard.tsx        # メインダッシュボード
│   ├── MeetingCard.tsx      # 予定カード
│   ├── AgendaList.tsx       # アジェンダ表示
│   ├── ModeratorPanel.tsx   # 司会君コントロール
│   ├── ScriptEditor.tsx     # 台本エディタ
│   └── StatusBadge.tsx      # 状態バッジ
└── lib/
    ├── types.ts             # 型定義
    ├── format.ts            # 日時整形
    └── mock-data.ts         # モックデータ
```

## Microsoft Graph セットアップ

1. Entra ID でアプリ登録 → クライアントシークレット発行
2. アプリ権限 (Application) で以下を付与し、管理者の同意:
   - `Calendars.Read` (または `Calendars.Read.All`)
   - `OnlineMeetings.ReadWrite.All` (後で bot 参加するなら)
3. `.env.local` に下記を設定:
   ```
   AZURE_TENANT_ID=...
   AZURE_CLIENT_ID=...
   AZURE_CLIENT_SECRET=...
   GRAPH_USER_ID=user@example.onmicrosoft.com   # 予定を読みたいユーザーの UPN または ID
   GRAPH_CALENDAR_ID=                            # 既定カレンダー以外を見たい場合のみ
   ```
4. `npm run dev` → ヘッダ右上の "Microsoft Graph: 接続中" を確認

未設定の場合は `src/lib/mock-data.ts` のモックが自動表示され、画面上部に注意バーが出ます。

## Azure Speech セットアップ

```
AZURE_SPEECH_KEY=...
AZURE_SPEECH_REGION=japaneast
AZURE_SPEECH_VOICE=ja-JP-NanamiNeural
```

「音声プレビュー」パネルからセクション/話速/ピッチを指定して合成・試聴可能。

## 次のステップ

- **ACS Call Automation で Teams 会議参加** — `apps/teams-bot` を追加し、生成済み TTS 音声を実際の会議にストリーム配信
- **議事録自動生成** — Teams transcription + 要約 LLM

## 環境変数

`.env.example` を `.env.local` にコピーして利用してください。
