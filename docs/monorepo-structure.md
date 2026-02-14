# モノレポ構造

このドキュメントは、`account-book-app` のディレクトリ構造に関する正本（Single Source of Truth）です。

## 目的

- ルート配下の責務を統一して把握する
- 新規ファイル/モジュールの配置先判断を明確にする
- `README` / `.github/instructions/*.instructions.md` から参照される一次情報を提供する

## ディレクトリ構造（概要）

```text
account-book-app/
├── apps/
│   ├── frontend/          # Next.js フロントエンド
│   └── backend/           # Hono バックエンド
├── packages/
│   ├── shared/            # 共有スキーマ/型定義
│   └── db/                # DB スキーマ・マイグレーション
├── docs/                  # プロジェクトドキュメント
├── assets/                # 設計資料（図など）
└── ルート設定ファイル       # turbo / pnpm / tsconfig など
```

## 各ディレクトリの責務

### `apps/frontend`

- ユーザー向け UI（Next.js App Router）
- 画面、コンポーネント、フロントエンド側テスト

### `apps/backend`

- API 層（Hono）
- ドメイン、ユースケース、コントローラー、インフラ実装

### `packages/shared`

- フロントエンド/バックエンド共通の Zod スキーマと型
- アプリ固有ではなく横断利用される定義

### `packages/db`

- Drizzle ORM スキーマ定義
- マイグレーション、DB 接続関連

### `docs`

- 運用・設計・仕様などの文書
- 本ファイル（モノレポ構造）の正本を配置

## 更新ルール

- 新しいトップレベル/ワークスペースを追加した場合は、このファイルを最優先で更新する
- `.github/instructions/*.instructions.md` には詳細を複製せず、原則として本ファイルへの参照リンクのみを記載する
- `README` には概要のみを記載し、詳細は本ファイルへ誘導する
