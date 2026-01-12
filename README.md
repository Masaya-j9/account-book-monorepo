# 家計簿アプリ

## プロジェクト構成

このプロジェクトは **Turborepo** と **pnpm workspaces** を使用したモノレポ構成です。

### ディレクトリ構造

```
account-book-app/
├── apps/
│   ├── frontend/          # Next.jsフロントエンドアプリケーション
│   └── backend/           # Honoバックエンドアプリケーション
├── packages/
│   ├── shared/            # フロントエンドとバックエンドで共有するコード
│   └── db/                # データベース関連のパッケージ
└── package.json           # ルートのpackage.json（ワークスペース設定）
```

## 技術スタック

### 言語

- **TypeScript** - 型安全な JavaScript

### 実行環境

- **Node.js** - サーバーサイド JavaScript 実行環境

### フロントエンド (`apps/frontend`)

- **Next.js 15** - React フレームワーク
- **Turbopack** - 高速バンドラー
- **Tailwind CSS** - ユーティリティファースト CSS フレームワーク
- **Biome** - リンター・フォーマッター
- **Vitest** - 高速ユニットテストフレームワーク
- **Testing Library** - React コンポーネントテスト

### バックエンド (`apps/backend`)

- **Hono** - 高速軽量な Web フレームワーク
- **Effect-TS (`effect`)** - Effect システム（副作用・非同期・エラーを型で扱う）
- **tsx** - TypeScript 実行環境（開発用）
- **Vitest** - 高速ユニットテストフレームワーク

### データベース (`packages/db`)

- **PostgreSQL** - オープンソースのリレーショナルデータベース
- **Drizzle ORM** - TypeScript ファーストの軽量 ORM
- 型安全なデータベースクエリとマイグレーション管理

### 共通パッケージ (`packages/shared`)

- **Zod** - スキーマバリデーション
- フロントエンドとバックエンドで共有する型定義とバリデーションスキーマ

### モノレポツール

- **Turborepo** - 高性能なビルドシステム
- **pnpm workspaces** - パッケージ管理

## 環境構築

### 依存関係のインストール

```shell
corepack enable
pnpm install
```

このコマンドにより、ルートと全てのワークスペース（`apps/frontend`, `apps/backend`, `packages/shared`, `packages/db`）の依存関係が一括でインストールされます。

このプロジェクトでは Turborepo をローカル依存（devDependencies）として利用しているため、まず `pnpm install` を実行して `turbo` を使える状態にしてください。

補足: Node.js に同梱されている Corepack を使うことで、ルートの `package.json` に指定した `packageManager`（pnpm のバージョン）を自動で利用できます。

### データベースのセットアップ

#### 方法 1: Docker Compose を使用（推奨）

Docker Compose を使用すると、PostgreSQL を簡単にセットアップできます。

```shell
# PostgreSQLコンテナを起動
docker compose up -d

# コンテナの状態を確認
docker compose ps

# ログを確認
docker compose logs postgres

# コンテナを停止
docker compose down

# データを削除してコンテナを停止
docker compose down -v
```

環境変数の設定：

```shell
# .env.exampleをコピーして.envファイルを作成
cp .env.example .env

# 必要に応じて.envファイルを編集
```

デフォルトの接続情報：

- **接続 URL**: `postgresql://postgres:postgres@localhost:5432/account_book_app`


#### 環境変数の設定

`.env`ファイルを作成して、データベース接続情報を設定します：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/account_book_app"
```

#### マイグレーションの実行

```shell
# マイグレーションファイルの生成
pnpm --filter @account-book-app/db run db:generate

# マイグレーションの適用
pnpm --filter @account-book-app/db run db:migrate

# Drizzle Studio の起動（GUI でデータベースを確認）
pnpm --filter @account-book-app/db run db:studio
```

### サーバーの起動

```shell
# すべてのアプリケーションを並列起動
pnpm run dev

# フロントエンドのみ起動
pnpm run dev --filter=frontend

# バックエンドのみ起動（推奨）
pnpm run dev:backend

# turbo の filter を直接使う場合
pnpm exec turbo run dev --filter=backend
```

起動後のアクセス先：

- **フロントエンド**: http://localhost:3000
- **バックエンド**: http://localhost:4000

バックエンドの簡易動作確認（ヘルスチェック）：

```shell
curl -sS http://localhost:4000/
```

### ビルド

```shell
# すべてのアプリケーションをビルド
pnpm run build

# turbo コマンドが見つからない場合（PATHに無い場合）は npx 経由でも実行できます
pnpm exec turbo run build

# 特定のアプリケーションのみビルド
pnpm run build --filter=frontend

# バックエンドのみビルド（推奨）
pnpm run build:backend
```

バックエンドのみを「ビルド→起動」する場合：

```shell
pnpm run start:backend
```

ビルドの考え方：

- `packages/db` と `packages/shared` は `tsup` で `dist/` を生成し、アプリ側は package の `exports`（`dist`）を参照します
- `apps/backend` は `tsup` で `dist/` を生成した上で `tsc --noEmit` で型チェックします

## コード品質管理

### リント（Lint）

Biome を使用してコードの品質チェックを行います。

```shell
# すべてのワークスペースでリントを並列実行
pnpm run lint

# フロントエンドのみリント
pnpm run lint --filter=frontend

# バックエンドのみリント
pnpm run lint:backend
```

### フォーマット（Format）

Biome を使用してコードを自動フォーマットします。

```shell
# すべてのワークスペースでフォーマットを並列実行
pnpm run format

# フロントエンドのみフォーマット
pnpm run format --filter=frontend

# バックエンドのみフォーマット
pnpm run format:backend
```

### テスト（Test）

Vitest を使用してユニットテストを実行します。

```shell
# すべてのワークスペースでテストを並列実行（ワッチモード）
pnpm test

# すべてのワークスペースでテストを一度だけ実行（CI/CD向け）
pnpm run test:run

# すべてのワークスペースでテストをUIモードで実行（ブラウザで結果確認）
pnpm run test:ui

# フロントエンドのみテスト
pnpm test --filter=frontend

# バックエンドのみテスト
pnpm test --filter=backend
```

#### テストファイルの命名規則

- テストファイルは `*.test.ts` または `*.test.tsx` の命名規則に従います
- テスト対象ファイルと同じディレクトリに配置することを推奨

例：

```
src/
  ├── utils.ts
  ├── utils.test.ts        # ユーティリティのテスト
  └── components/
      ├── Button.tsx
      └── Button.test.tsx   # コンポーネントのテスト
```

### 推奨ワークフロー

開発中は以下のコマンドを定期的に実行することを推奨します：

```shell
# 1. コードをフォーマット
pnpm run format

# 2. リントでエラーチェック
pnpm run lint

# 3. テストを実行
pnpm run test:run

# 4. ビルドして型チェック
pnpm run build
```

## 共有パッケージの使用方法

`packages/shared`は、フロントエンドとバックエンドの両方から参照できる共通のコードを格納しています。

### インポート方法

```typescript
// フロントエンド・バックエンド共通
import { スキーマ名 } from "@account-book-app/shared";
```

### TypeScript 設定

アプリ（`apps/*`）からは `@account-book-app/shared` を通常のパッケージとして import します。
モノレポ内のパッケージは `exports` で `dist` を公開しているため、アプリ側の TypeScript で `packages/*/src` を直接参照しない運用にしています（`rootDir` 逸脱やファイルリスト不整合を避けるため）。

## データベースパッケージの使用方法

`packages/db`は、Drizzle ORM を使用したデータベーススキーマとクエリを管理します。

### インポート方法

```typescript
// データベース接続とスキーマのインポート
import { db } from "@account-book-app/db";
import { users, transactions } from "@account-book-app/db/schema";
```

### TypeScript 設定

バックエンドからは `@account-book-app/db` を通常のパッケージとして import します。
スキーマなどの import は `@account-book-app/db` が公開しているエントリポイント経由で行います。

### Drizzle ORM の基本的な使用例

```typescript
// データの取得
const allUsers = await db.select().from(users);

// データの挿入
await db.insert(users).values({
  name: "John Doe",
  email: "john@example.com",
});

// データの更新
await db.update(users).set({ name: "Jane Doe" }).where(eq(users.id, 1));

// データの削除
await db.delete(users).where(eq(users.id, 1));
```

## 開発のヒント

### Turborepo の機能

- **並列実行**:

  - `pnpm run dev` - フロントエンドとバックエンドが同時に起動
  - `pnpm run lint` - すべてのワークスペースで並列にリント実行
  - `pnpm run format` - すべてのワークスペースで並列にフォーマット実行
  - `pnpm run test:run` - すべてのワークスペースで並列にテスト実行
  - 複数のタスクを効率的に実行し、開発時間を短縮

- **キャッシュ機能**:

  - ビルドやリントの結果がキャッシュされ、変更がない場合は再実行をスキップ
  - 2 回目以降の実行が劇的に高速化

- **依存関係の自動解決**:
  - `dependsOn`で定義された依存タスクを自動的に実行
  - 例：`build`タスクは依存パッケージのビルドを先に実行

### フィルターオプション

特定のワークスペースのみを対象にタスクを実行：

```shell
# 単一ワークスペース
pnpm run dev --filter=frontend
pnpm run lint --filter=backend

# 複数ワークスペース
pnpm run build --filter=frontend --filter=backend

# パターンマッチング
pnpm run lint --filter=apps/*
```

### 便利なコマンド組み合わせ

```shell
# 開発開始時（すべてのサーバーを起動）
pnpm run dev

# コミット前（フォーマット→リント→テスト→ビルド）
pnpm run format && pnpm run lint && pnpm run test:run && pnpm run build

# 特定のアプリのみ再起動
pnpm run dev --filter=backend

# テストをウォッチモードで実行しながら開発
pnpm test  # 別ターミナルで実行
```
