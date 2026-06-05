# AI-Voice司会くん 技術仕様書

> 最終更新: 2026-06-05 / 対象ブランチ: `feat/voice-reader-init`

## 1. 概要

ブラウザに貼り付けた文章を、内蔵 TTS（テキスト読み上げ）で発声する Web アプリ。固有名詞辞書・メンバー名簿・台本テンプレ・プレースホルダ機構を備え、最終的には朝会で自分の代わりに司会進行する分身ボイスツールを目指す。

- **アプリ URL ベース**: `/reader`
- **主ターゲット**: ユーザー本人（dog-food）
- **動作環境**: Edge / Chrome 最新版（Web Speech API 対応必須）
- **状態保存**: ブラウザの `localStorage` のみ。サーバ DB なし

## 2. 技術スタック

| レイヤ | 採用 | バージョン / 備考 |
|--------|------|---------------|
| 言語 | TypeScript | 5.5 系、`strict` 有効 |
| UI ライブラリ | React | 18.3 |
| フレームワーク | Next.js | 14.2（App Router） |
| スタイル | Tailwind CSS | 3.4 |
| 音声合成 | Web Speech API (`window.speechSynthesis`) | ブラウザ内蔵 |
| 永続化 | `localStorage` | キーは `voice-reader.*` で名前空間化 |
| ビルド / 実行 | Node.js | 20 LTS 推奨（24 でも動作確認済み） |

### 採用しなかったもの
- サーバ DB / 認証 / 状態同期サーバ → 個人 dog-food のため不要
- クラウド TTS（Azure / OpenAI / ElevenLabs 等） → 課金回避・キー取得回避のため
- 形態素解析 / NLP ライブラリ → MVP では文字列マッチで十分

## 3. アーキテクチャ

```
┌────────────────────────────────────────┐
│ ブラウザ (Edge / Chrome)               │
│  ┌──────────────────────────────────┐  │
│  │ React App (Next.js)              │  │
│  │  - /reader              page.tsx │  │
│  │  - /reader/dictionary   page.tsx │  │
│  │  - /reader/members      page.tsx │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │ Web Speech API (window.~)        │  │
│  │  - speechSynthesis.speak()       │  │
│  │  - SpeechSynthesisUtterance      │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │ localStorage                     │  │
│  │  - voice-reader.dictionary       │  │
│  │  - voice-reader.members          │  │
│  │  - voice-reader.templates        │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
            ↑ HTTP (dev only)
            │
┌────────────────────────────────────────┐
│ Next.js dev server (Node.js)           │
│  localhost:3000 で待機                  │
│  ホットリロード対応                       │
└────────────────────────────────────────┘
```

### クライアント / サーバ分担

| やっていること | 場所 |
|------------|------|
| UI レンダリング | ブラウザ（React） |
| 状態管理 | ブラウザ（React useState） |
| データ永続化 | ブラウザ（localStorage） |
| TTS 発声 | ブラウザ（Web Speech API） |
| 静的ファイル配信 | Next.js dev server |
| サーバ API | **なし**（API Route 不使用） |

サーバ側は **静的ファイルを配るだけ**。アプリの本体ロジックは全部ブラウザで動く（SPA に近い構成）。

## 4. ディレクトリ構成

```
src/
├── app/
│   ├── layout.tsx                  # ルートレイアウト（ivoice 共通）
│   ├── page.tsx                    # ivoice 本体（未使用想定）
│   └── reader/                     # voice-reader 本体
│       ├── layout.tsx              # /reader 以下のタイトル等を上書き
│       ├── page.tsx                # メイン画面（textarea + プレーヤー）
│       ├── dictionary/
│       │   └── page.tsx            # 固有名詞辞書ページ
│       └── members/
│           └── page.tsx            # メンバー名簿ページ
└── lib/                            # フロント用ユーティリティ
    ├── tts.ts                      # Web Speech API ラッパ
    ├── dictionary.ts               # 辞書 CRUD（localStorage）
    ├── replace.ts                  # 辞書置換ロジック
    ├── members.ts                  # メンバー CRUD（localStorage）
    ├── members-apply.ts            # メンバー置換ロジック（敬称対応）
    ├── templates.ts                # 台本テンプレ CRUD
    ├── sections.ts                 # # 見出しでセクション分割
    ├── placeholders.ts             # {key} プレースホルダ展開
    ├── normalize.ts                # 読み上げ前の句読点整理
    └── cleanup.ts                  # Copilot 出力整形（手動ボタン）

docs/voice-reader/
├── PLAN.md                         # 企画書（決定事項）
└── SPEC.md                         # 本書（実装仕様）
```

ivoice 本体のコード（`src/app/api/*`, `src/components/*`, `src/services/*` 等）は残存しているが、voice-reader 側では参照していない。

## 5. 画面構成と URL

| URL | コンポーネント | 役割 |
|-----|--------------|------|
| `/reader` | `src/app/reader/page.tsx` | 台本入力、プレースホルダ、声・話速設定、再生 |
| `/reader/dictionary` | `src/app/reader/dictionary/page.tsx` | 表記 → よみがな の辞書編集 |
| `/reader/members` | `src/app/reader/members/page.tsx` | 氏名・よみ・敬称・自分フラグの編集 + CSV 一括追加 |

### 全画面共通

- `<html lang="ja">`、Tailwind の `bg-slate-50 text-slate-900`
- ブラウザタブタイトル: `AI-Voice司会くん`（`/reader/layout.tsx` で metadata を上書き）

## 6. データモデル（localStorage）

すべてのデータは `voice-reader.*` キー名前空間でブラウザの localStorage に JSON 文字列として保存。

### 6.1 辞書 — `voice-reader.dictionary`

```ts
type DictionaryEntry = {
  id: string;        // UUID
  surface: string;   // 表記（例: "PCDT"）
  reading: string;   // よみがな（例: "ピーシーディーティー"）
};

type Stored = DictionaryEntry[];
```

汎用語の読み上げ補正用。人名以外（社内用語・略語）に使う想定。

### 6.2 メンバー — `voice-reader.members`

```ts
type Honorific = "さん" | "くん" | "様" | "";

type Member = {
  id: string;
  surface: string;       // 氏名（例: "水口"）
  reading: string;       // よみがな（例: "みずぐち"）
  honorific: Honorific;  // 自動付与する敬称
  isSelf?: boolean;      // true なら敬称を一切付けない（自分自身用）
};

type Stored = Member[];
```

人名専用。敬称付与ロジックを持つため辞書と分離。

### 6.3 台本テンプレ — `voice-reader.templates`

```ts
type Template = {
  id: string;
  name: string;        // 表示名（例: "朝会"）
  text: string;        // 台本本文
  updatedAt: number;   // 最終更新エポック ms
};

type Stored = Template[];
```

`name` がユニークキー扱い。同名 upsert は確認ダイアログ後に上書き。

### 永続化の境界

- **永続**: 辞書 / メンバー / テンプレ（明示削除まで残る）
- **セッション**: プレースホルダ値、テキスト編集中の状態、再生位置（リロードで消える）

## 7. 読み上げパイプライン

`/reader` で「通常読み上げ」または「司会モードで再生」を押した時、テキストは以下の変換を順に通って TTS エンジンに渡される。

```
入力テキスト
   │
   ▼
[1] textarea プレースホルダ展開
   {本日の予定} {明日の予定} 等を該当値で置換
   │
   ▼
[2] メンバー置換 (applyMembers)
   表記 → よみがな + 敬称
   既存の敬称があれば優先、isSelf なら剥がす
   │
   ▼
[3] 単純プレースホルダ展開
   {date} {presenter} 等を値で置換
   ※ メンバー処理後なので敬称が付かない
   │
   ▼
[4] 辞書置換 (applyDictionary)
   表記 → よみがな（メンバー以外の語）
   │
   ▼
[5] 読み上げ正規化 (normalizeForSpeak)
   （ ）：／ → 「、」、「」『』【】 → 削除、連続「、」を圧縮
   │
   ▼
   ┌────────────┐
   │ 通常読み上げ │ → speechSynthesis.speak(全文)
   └────────────┘
   ┌────────────┐
   │ 司会モード   │ → セクション分割 → 各 body を順次 speak、間に setTimeout
   └────────────┘
```

### 7.1 各ステップの根拠

| ステップ | なぜこの順番 |
|---------|---------|
| [1] textarea 先 | Copilot 貼り付け内の氏名にも [2] メンバーを当てたいため |
| [2] メンバー | 自由文中の氏名に敬称を自動付与 |
| [3] 単純プレースホルダ | `{presenter}` から入った氏名には敬称を付けない（明示性を優先） |
| [4] 辞書 | 全置換後の最終形に対して語の読みを補正 |
| [5] 正規化 | TTS が読みづらい記号を最後に処理 |

### 7.2 メンバー置換の詳細

`src/lib/members-apply.ts` の `applyMembers`：

```
正規表現: {surface}(さん|くん|君|様|ちゃん|氏)?

挙動:
- foundHonorific があれば → reading + foundHonorific（既存優先）
- なければ → reading + member.honorific
- ただし member.isSelf が true → reading のみ（敬称剥がす）
```

複数メンバーがある場合は **surface の長い順** に処理（部分一致衝突を避けるため）。

### 7.3 プレースホルダの種類

`src/lib/placeholders.ts` の `extractPlaceholders` が `\{([^{}\s]+)\}` で抽出。

| 種類 | 判定 | UI | 値の出どころ |
|------|------|---|----------|
| 組み込み | `BUILTIN_KEYS` に含む（`date`, `today`, `date_full`, `weekday`, `time`） | テキスト入力（自動入力済み） | `defaultValueFor()` で算出 |
| 人物 | `PERSON_KEYS` に含む（`presenter`, `担当者`） | ドロップダウン（メンバーから選択）／なければテキスト | メンバー surface |
| 複数行 | `isTextareaPlaceholder(key)` が true（`/予定|本文|内容|schedule|content/i`） | textarea（複数行） | 手入力・貼り付け |
| その他 | 上記以外 | テキスト入力 | 手入力 |

`hasUnfilledPlaceholders` が真の場合は再生ボタンを無効化（未入力警告）。

## 8. 主要機能

### 8.1 通常読み上げ

`speechSynthesis.speak()` を 1 回呼ぶ。1 つの utterance で全文を発声。

- 一時停止・再開・停止可
- 話速・声は **utterance 作成時に固定**（Web Speech API 仕様）。再生中の変更は次回 speak まで反映されない

### 8.2 司会モード（セクション再生）

`# 見出し` または `＃ 見出し` でテキストを分割し、セクションごとに別 utterance で発声。セクション間に `pauseSec` 秒の間。

- 「次のセクションへ →」で待機をスキップ
- 「停止」で全中断
- 話速・声の変更は **次のセクションから反映**（`useRef` で最新値を保持）

実装: `src/app/reader/page.tsx` の `handleHostMode()`。

### 8.3 固有名詞辞書

`/reader/dictionary` で CRUD。読み上げ時に表記 → よみがなを単純文字列置換。

### 8.4 メンバー名簿

`/reader/members` で CRUD + CSV 一括追加。

- 敬称（さん／くん／様／なし）を自動付与
- 本文に既に敬称が書かれていればそれを優先
- 「自分」フラグ ON で敬称を完全に剥がす（1 人だけ ON 可）

### 8.5 台本テンプレ

`/reader` 上部のプルダウンから呼び出し、「現在を保存」で上書き／新規。同名は確認後に上書き。

### 8.6 プレースホルダ

詳細は §7.3。

### 8.7 Copilot 出力整形（手動ボタン）

`src/lib/cleanup.ts` の `cleanupForReading()`。textarea 内容を整形：

- `**xxx**` → `xxx`（太字記号削除）
- `## ` `### ` → `# `（見出しレベル統一）
- 全角 `＃` → 半角 `# `
- 行頭の `- ` `* ` → 削除
- 空行で囲まれた短い行（句読点なし）に `# ` を前置（セクション化）
- 連続空行を 1 行に圧縮

### 8.8 読み上げ前の正規化（自動）

`src/lib/normalize.ts` の `normalizeForSpeak()`：

| 入力 | 出力 |
|------|------|
| `（` `）` `(` `)` | 「、」 |
| `：` `:` | 「、」 |
| `／` `/` | 「、」 |
| 「」『』【】 | 削除 |
| 連続「、」 | 1 つに圧縮 |

textarea の見た目は変えず、speak 直前のみ適用。

## 9. 状態管理

すべて React の `useState` で局所管理。グローバルストア（Redux 等）なし。

### 主要 state（`/reader/page.tsx`）

| state | 用途 |
|-------|------|
| `text` | textarea の本文 |
| `voices` | 利用可能な日本語声リスト（初回 effect で取得） |
| `voiceURI` | 選択中の声 |
| `rate` | 話速 0.5〜1.5（デフォルト 1.1） |
| `pauseSec` | セクション間の間 秒（デフォルト 1） |
| `status` | "idle" / "speaking" / "paused" / "between" |
| `supported` | Web Speech API 対応可否 |
| `dictionary` | localStorage から読込 |
| `members` | localStorage から読込 |
| `templates` | localStorage から読込 |
| `selectedTemplateId` | 現在選択中のテンプレ id |
| `currentSectionIndex` | 司会モード中の再生セクション番号 |
| `placeholderValues` | プレースホルダ key → 値 のマップ |

### 主要 ref

| ref | 用途 |
|-----|------|
| `stoppedRef` | 司会モードの停止フラグ（async ループ離脱） |
| `advanceRef` | セクション間 setTimeout の即時 resolve 用 |
| `rateRef` | 最新話速を司会モード次セクションで読む用 |
| `voiceURIRef` | 同じく最新の声 |

## 10. 開発・運用

### 起動

```bash
npm install
npm run dev
# http://localhost:3000/reader
```

### 主要コマンド

| コマンド | 内容 |
|--------|------|
| `npm run dev` | 開発サーバ（ホットリロード） |
| `npm run build` | 本番ビルド（`.next/` 生成） |
| `npm run start` | 本番モード起動（要 build） |
| `npm run typecheck` | TypeScript 型チェック |
| `npm run lint` | ESLint |

### 環境変数

**なし**。voice-reader は外部サービスを呼ばないため `.env.local` 不要。
（ivoice 本体側は Azure / Graph 等の環境変数を使うが voice-reader とは独立）

### 公開範囲

dev server は `localhost` のみ。社内 LAN や外部公開する場合は別途仕組みが必要（IIS リバプロ・Node.js 本番モード・静的サイト化等）。

## 11. 既知の制約

| 項目 | 内容 |
|------|------|
| 録音不可 | Web Speech API は発声のみ。mp3 出力は別エンジン必要 |
| ブラウザ依存 | Edge と Chrome で日本語声のラインナップが異なる。Safari は不安定 |
| 長文中断 | OS によっては数十秒〜数分で勝手に止まることがある（既知問題） |
| 話速変更 | 通常モードは utterance 生成時に固定。司会モードは次セクションから反映 |
| 永続化範囲 | localStorage はブラウザ単位。デバイス間共有・バックアップ機能は未実装 |
| Teams 配信不可 | 朝会で bot として喋らせるには別エンジン（Azure Speech 等）が必要 |

## 12. ロードマップ（参考）

PLAN.md §7 と同じ。

| Phase | 内容 | 状態 |
|-------|------|------|
| MVP | 貼って読む + 辞書 | ✅ 完了 |
| Phase 2 | テンプレ保存 | ✅ 完了 |
| Phase 3 | 司会モード（セクション分け） | ✅ 完了 |
| 磨き | プレースホルダ・メンバー・整形 | ✅ 完了 |
| Phase 4 | 朝会で Teams へ音声配信 | 未着手（要 Azure 等） |

## 13. ファイル別行数（参考）

`src/lib/*` は全て純関数寄り。コンポーネントは `src/app/reader/*` に集中。

| ファイル | 役割 | 規模 |
|---------|------|------|
| `src/app/reader/page.tsx` | メイン UI + 司会ループ | 大（〜500 行） |
| `src/app/reader/dictionary/page.tsx` | 辞書編集 UI | 中 |
| `src/app/reader/members/page.tsx` | メンバー編集 UI | 中 |
| `src/lib/*.ts` | 各種ロジック | 各 30〜80 行 |
