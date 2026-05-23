# ivoice 司会君 ダッシュボード

SharePoint Online (SPO) の予定表と連動して、Teams 会議を自動で司会進行する bot のダッシュボード。

## 概要

- **本日の予定一覧**: SPO / Exchange 予定表から取得した会議を表示
- **司会君コントロール**: bot の Teams 会議参加・退出、自動進行 ON/OFF
- **アジェンダ管理**: 議題ごとの所要時間と担当者を可視化
- **司会台本エディタ**: オープニング / 遷移 / 警告 / クロージングを編集

現状はモックデータで動作する UI 雛形。Microsoft Graph / Azure Communication Services / Azure Speech との結線は次のステップで追加します。

## 技術スタック

| レイヤ | 技術 |
|--------|------|
| ダッシュボード UI | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| カレンダー連携 (予定) | Microsoft Graph API (`/users/{id}/calendar/events`) |
| Teams 会議参加 (予定) | Azure Communication Services Call Automation |
| 音声合成 (予定) | Azure AI Speech (Neural TTS, ja-JP-NanamiNeural) |
| 認証 (予定) | Microsoft Entra ID (MSAL / client credentials) |
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

## 次のステップ

1. **Microsoft Graph 連携**
   - `services/graph` ディレクトリを追加し、`@microsoft/microsoft-graph-client` で SPO 予定表を取得
   - `src/lib/mock-data.ts` をサーバアクション or API ルートに差し替え
2. **Azure Speech TTS**
   - `services/speech` を追加し、台本の `{{...}}` を会議情報で置換 → SSML 生成 → wav/pcm 出力
3. **ACS Call Automation で Teams 会議参加**
   - `apps/teams-bot` を追加し、ACS 経由で Teams 会議に bot 参加 → TTS 音声をストリーム配信
4. **認証**
   - Entra ID アプリ登録、`Calendars.Read.All` / `OnlineMeetings.ReadWrite.All` 等の権限付与
   - `.env.local` に資格情報を配置 (`.env.example` 参照)

## 環境変数

`.env.example` を `.env.local` にコピーして利用してください。
