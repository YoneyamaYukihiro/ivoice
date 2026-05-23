# ivoice 司会君 ダッシュボード

SharePoint Online (SPO) の予定表と連動して、Teams 会議を自動で司会進行する bot のダッシュボード。

## 概要

- **本日の予定一覧**: SPO / Exchange 予定表から取得した会議を表示
- **司会君コントロール**: bot の Teams 会議参加・退出、自動進行 ON/OFF
- **アジェンダ管理**: 議題ごとの所要時間と担当者を可視化
- **司会台本エディタ**: オープニング / 遷移 / 警告 / クロージングを編集

**Microsoft Graph (SPO/Exchange 予定表)**、**Azure Speech (Neural TTS)**、**ACS Call Automation (Teams 会議参加・発話)**、**Claude による議事録要約 + Graph 投稿**、**事前承認 UI**、**複数会議スケジューラ** をすべて結線。資格情報が `.env.local` にあれば実機接続、未設定時は自動でモック/シミュレーション/フォールバックに切り替わります。

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

## 議事録 / 要約 / 投稿セットアップ

```
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-sonnet-4-6

# 議事録投稿先
MINUTES_POST_MODE=channel    # none / channel / chat
MINUTES_TEAM_ID=...
MINUTES_CHANNEL_ID=...
MINUTES_CHAT_ID=
```

- 未設定なら **未設定モード** で発話ログを生で markdown 化して返す (LLM 課金なしで開発可能)
- 投稿には Graph 側で `ChannelMessage.Send` または `ChatMessage.Send` 系のアプリケーション権限が必要

### 議事録パイプライン

```
ACS transcription → /api/transcript (lines) → Claude (Anthropic Messages API, prompt caching 有効)
                                                     ↓
                                              { markdown, decisions, actionItems }
                                                     ↓
                                              /api/minutes?post=true → Graph で Teams 投稿
```

UI からは手動で発話を追加することもでき、ACS transcription を有効化していない開発環境でも要約が試せます。

## 機能一覧

| 機能 | 場所 |
|------|------|
| 本日の予定 (Graph) | ヘッダ + 左サイドバー |
| スケジューラ (自動操縦) | 右上 — 時刻に合わせて自動 join/leave |
| 司会君コントロール | ModeratorPanel — 参加・退出・5 セクション発話 |
| 事前承認モード | ModeratorPanel — チェックボックス ON で発話前にレビュー |
| アジェンダ | AgendaList |
| 一言ネタ | IcebreakerPanel — 4 カテゴリ x 15 種 |
| 音声プレビュー | SpeechPreview — 話速・ピッチ調整付き |
| 議事録生成・投稿 | MinutesPanel — 発話追加、Claude 要約、Teams 投稿、md ダウンロード |
| 台本エディタ | ScriptEditor |

## 次のステップ

- **本物の ACS transcription WebSocket 接続** — `startTranscription()` を呼んで WebSocket でリアルタイムに `/api/transcript` を埋める
- **承認待ち発話のキュー化** — 複数セクションを並べてまとめて承認
- **権限 / 操作ログの永続化** — 現状 in-memory なのでサーバ再起動で消える

## 環境変数

`.env.example` を `.env.local` にコピーして利用してください。
