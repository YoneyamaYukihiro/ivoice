# ivoice 司会君 ダッシュボード

SharePoint Online (SPO) の予定表と連動して、Teams 会議を自動で司会進行する bot のダッシュボード。

## 概要

- **本日の予定一覧**: SPO / Exchange 予定表から取得した会議を表示
- **司会君コントロール**: bot の Teams 会議参加・退出、自動進行 ON/OFF
- **アジェンダ管理**: 議題ごとの所要時間と担当者を可視化
- **司会台本エディタ**: オープニング / 遷移 / 警告 / クロージングを編集

**Microsoft Graph (SPO/Exchange 予定表)**、**Azure Speech (Neural TTS)**、**ACS Call Automation (Teams 会議参加・発話)** すべて結線済み。資格情報が `.env.local` にあれば実機接続、未設定時は自動でモック/シミュレーションにフォールバックします。

## 技術スタック

| レイヤ | 技術 |
|--------|------|
| ダッシュボード UI | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| カレンダー連携 | Microsoft Graph API (`/users/{id}/calendarView`) ✅ |
| 音声合成 | Azure AI Speech (Neural TTS, ja-JP-NanamiNeural) ✅ |
| 認証 | Microsoft Entra ID (client credentials, `.default` scope) ✅ |
| Teams 会議参加 | Azure Communication Services Call Automation ✅ |
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

## ACS Call Automation セットアップ

1. ACS リソースを作成し、接続文字列を取得
2. Azure Portal で ACS と Cognitive Services リソースを接続 (TextSource の TTS で必要)
3. 公開 HTTPS の callback URL を用意 (dev は ngrok / Azure Dev Tunnels)
4. Entra ID で bot 用のアプリ登録を行い、`Calls.JoinGroupCall.All` 等の権限付与
5. `.env.local` に下記:
   ```
   ACS_CONNECTION_STRING=endpoint=https://...
   ACS_CALLBACK_URI=https://<your-public-host>/api/acs/callback
   ACS_TEAMS_BOT_APP_ID=<entra-id-application-id>
   ACS_TEAMS_APP_TENANT_ID=<tenant-id>
   ACS_COGNITIVE_SERVICES_ENDPOINT=https://<your-cogsvc>.cognitiveservices.azure.com/
   ```

未設定時は API が `simulated` モードでレスポンスし、ダッシュボード上に「シミュレーション」バッジが表示されます。

### API エンドポイント

- `POST /api/acs/join` — bot を会議に参加させ `callConnectionId` を発行
- `POST /api/acs/play` — 台本セクションを差し込み + 発話
- `POST /api/acs/leave` — bot を退出
- `POST /api/acs/callback` — ACS からの Call Automation イベント受信 webhook

### 注意点

ACS Call Automation 1.4.0 (stable) の `CallLocator` はまだ Teams meeting link を直接受け付けないため、現状は `MicrosoftTeamsAppIdentifier` を target にした `createCall` 経路を使っています。会議 URL からの直接参加が preview SDK に降りてきたら `joinAsTeamsApp` を差し替える想定です。

## 次のステップ

- **議事録自動生成** — ACS Call Automation の transcription + 要約 LLM
- **発話の事前承認 UI** — TTS プレビューを承認してから会議に流す安全弁
- **複数会議の同時進行** — 1 司会君が複数会議を順番に司会するスケジューラ

## 環境変数

`.env.example` を `.env.local` にコピーして利用してください。
