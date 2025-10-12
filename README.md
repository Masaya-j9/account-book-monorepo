# 家計簿アプリ

## プロジェクト構成

このプロジェクトは **Turborepo** と **npm workspaces** を使用したモノレポ構成です。

### ディレクトリ構造

```
account-book-app/
├── app/
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

### フロントエンド (`app/frontend`)

- **Next.js 15** - React フレームワーク
- **Turbopack** - 高速バンドラー
- **Tailwind CSS** - ユーティリティファースト CSS フレームワーク
- **Biome** - リンター・フォーマッター
- **Vitest** - 高速ユニットテストフレームワーク
- **Testing Library** - React コンポーネントテスト

### バックエンド (`app/backend`)

- **Hono** - 高速軽量な Web フレームワーク
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
- **npm workspaces** - パッケージ管理

## 環境構築

### 依存関係のインストール

```shell
npm install
```

このコマンドにより、ルートと全てのワークスペース（`app/frontend`, `app/backend`, `packages/shared`, `packages/db`）の依存関係が一括でインストールされます。

### データベースのセットアップ

#### PostgreSQL のインストール

```shell
# Homebrewを使用する場合
brew install postgresql@15
brew services start postgresql@15
```

#### データベースの作成

```shell
# PostgreSQLに接続
psql postgres

# データベースを作成
CREATE DATABASE account_book_app;
```

#### 環境変数の設定

`.env`ファイルを作成して、データベース接続情報を設定します：

```env
DATABASE_URL="postgresql://username:password@localhost:5432/account_book_app"
```

#### マイグレーションの実行

```shell
# マイグレーションファイルの生成
npm run db:generate --filter=db

# マイグレーションの適用
npm run db:migrate --filter=db

# Drizzle Studio の起動（GUI でデータベースを確認）
npm run db:studio --filter=db
```

### サーバーの起動

```shell
# すべてのアプリケーションを並列起動
npm run dev

# フロントエンドのみ起動
npm run dev --filter=frontend

# バックエンドのみ起動
npm run dev --filter=backend
```

起動後のアクセス先：

- **フロントエンド**: http://localhost:3000
- **バックエンド**: http://localhost:4000

### ビルド

```shell
# すべてのアプリケーションをビルド
npm run build

# 特定のアプリケーションのみビルド
npm run build --filter=frontend
npm run build --filter=backend
```

## コード品質管理

### リント（Lint）

Biome を使用してコードの品質チェックを行います。

```shell
# すべてのワークスペースでリントを並列実行
npm run lint

# フロントエンドのみリント
npm run lint --filter=frontend

# バックエンドのみリント
npm run lint --filter=backend
```

### フォーマット（Format）

Biome を使用してコードを自動フォーマットします。

```shell
# すべてのワークスペースでフォーマットを並列実行
npm run format

# フロントエンドのみフォーマット
npm run format --filter=frontend

# バックエンドのみフォーマット
npm run format --filter=backend
```

### テスト（Test）

Vitest を使用してユニットテストを実行します。

```shell
# すべてのワークスペースでテストを並列実行（ワッチモード）
npm test

# すべてのワークスペースでテストを一度だけ実行（CI/CD向け）
npm run test:run

# すべてのワークスペースでテストをUIモードで実行（ブラウザで結果確認）
npm run test:ui

# フロントエンドのみテスト
npm test --filter=frontend

# バックエンドのみテスト
npm test --filter=backend
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
npm run format

# 2. リントでエラーチェック
npm run lint

# 3. テストを実行
npm run test:run

# 4. ビルドして型チェック
npm run build
```

## 共有パッケージの使用方法

`packages/shared`は、フロントエンドとバックエンドの両方から参照できる共通のコードを格納しています。

### インポート方法

```typescript
// フロントエンド・バックエンド共通
import { スキーマ名 } from "@account-book-app/shared";
```

### TypeScript 設定

各アプリケーションの`tsconfig.json`で以下のパスマッピングが設定されています：

```json
{
  "compilerOptions": {
    "paths": {
      "@account-book-app/shared": ["../../packages/shared/src"],
      "@account-book-app/shared/*": ["../../packages/shared/src/*"]
    }
  }
}
```

## データベースパッケージの使用方法

`packages/db`は、Drizzle ORM を使用したデータベーススキーマとクエリを管理します。

### インポート方法

```typescript
// データベース接続とスキーマのインポート
import { db } from "@account-book-app/db";
import { users, transactions } from "@account-book-app/db/schema";
```

### TypeScript 設定

バックエンドの`tsconfig.json`で以下のパスマッピングを設定：

```json
{
  "compilerOptions": {
    "paths": {
      "@account-book-app/db": ["../../packages/db/src"],
      "@account-book-app/db/*": ["../../packages/db/src/*"]
    }
  }
}
```

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

  - `npm run dev` - フロントエンドとバックエンドが同時に起動
  - `npm run lint` - すべてのワークスペースで並列にリント実行
  - `npm run format` - すべてのワークスペースで並列にフォーマット実行
  - `npm run test:run` - すべてのワークスペースで並列にテスト実行
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
npm run dev --filter=frontend
npm run lint --filter=backend

# 複数ワークスペース
npm run build --filter=frontend --filter=backend

# パターンマッチング
npm run lint --filter=apps/*
```

### 便利なコマンド組み合わせ

```shell
# 開発開始時（すべてのサーバーを起動）
npm run dev

# コミット前（フォーマット→リント→テスト→ビルド）
npm run format && npm run lint && npm run test:run && npm run build

# 特定のアプリのみ再起動
npm run dev --filter=backend

# テストをウォッチモードで実行しながら開発
npm test  # 別ターミナルで実行
```
