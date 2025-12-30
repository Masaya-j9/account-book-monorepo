# カテゴリー参照API設計ドキュメント

## 概要

このドキュメントは、Issue #10「カテゴリー参照ビジネスロジック（オニオンアーキテクチャ）論点まとめ」に基づいて実装されたカテゴリー参照API（カテゴリ一覧取得/単体取得）の設計方針と実装詳細を記述します。

## アーキテクチャ概要

本実装はオニオンアーキテクチャに基づいています。

### レイヤーの責務

#### 1. Domain Layer（ドメイン層）
**場所**: `apps/backend/src/domain/`

**責務**:
- ビジネスルールの定義
- エンティティとバリューオブジェクトの実装
- リポジトリインターフェースの定義（依存性逆転の原則）

**実装内容**:
- `UserCategoryRecord`: ユーザー固有の属性（isVisible, customName, displayOrder）を含む型
- `ICategoryRepository`: リポジトリの抽象インターフェース
  - `findAllWithPagination`: ページネーション付き一覧取得
  - `findByIdWithUser`: ユーザー権限を考慮した単体取得

#### 2. Application Layer（アプリケーション層）
**場所**: `apps/backend/src/services/categories/`

**責務**:
- ユースケースの実装
- 入力のバリデーションと正規化
- エラーハンドリング（Effect-TSを使用）

**実装内容**:
- `ListCategoriesUseCase`: カテゴリ一覧取得のユースケース
- `GetCategoryUseCase`: カテゴリ単体取得のユースケース

**エラー定義**:
- `InvalidPaginationError`: ページネーションパラメータ不正
- `InvalidSortParameterError`: ソートパラメータ不正
- `CategoryNotFoundError`: カテゴリが存在しない
- `InvalidCategoryIdError`: カテゴリID不正

#### 3. Infrastructure Layer（インフラストラクチャ層）
**場所**: `apps/backend/src/infrastructre/repositories/`

**実装内容**:
- `CategoryRepository`: Drizzle ORMを使用したリポジトリ実装
  - ページネーション処理（OFFSET/LIMIT）
  - ソート処理（ORDER BY）
  - 3テーブルJOIN: `user_categories` ⟕ `categories` ⟕ `transaction_types`

#### 4. Presentation Layer（プレゼンテーション層）
**場所**: `apps/backend/src/controller/routers/`

**実装内容**:
- `categoryRouter.list`: カテゴリ一覧取得エンドポイント
- `categoryRouter.get`: カテゴリ単体取得エンドポイント

**エラーマッピング**:
| アプリケーションエラー | HTTPステータス |
|----------------------|---------------|
| InvalidPaginationError | 400 BAD_REQUEST |
| InvalidSortParameterError | 400 BAD_REQUEST |
| InvalidCategoryIdError | 400 BAD_REQUEST |
| CategoryNotFoundError | 404 NOT_FOUND |
| Unexpected*Error | 500 INTERNAL_SERVER_ERROR |

## バリデーション方針

### バリデーションルール

#### カテゴリ一覧取得（list）
- `page`: 1以上の整数、デフォルト: 1
- `perPage`: 1〜100の整数、デフォルト: 30
- `sortBy`: "name" | "createdAt" | "displayOrder"、デフォルト: "displayOrder"
- `sortOrder`: "asc" | "desc"、デフォルト: "asc"
- `type`: "INCOME" | "EXPENSE" | undefined
- `includeHidden`: boolean、デフォルト: false

#### カテゴリ単体取得（get）
- `id`: 1以上の整数

## ページネーション設計

### レスポンス形式

```typescript
{
  items: UserCategory[],
  pageInfo: {
    page: number,
    perPage: number,
    totalPages: number,
  },
  total: number
}
```

### ページネーション実装

- **デフォルト値**: page=1, perPage=30
- **上限**: perPage は最大100
- **SQLクエリ**: `LIMIT perPage OFFSET (page - 1) * perPage`

## 並び順設計

### デフォルトの並び順

`displayOrder ASC`（ユーザーがカスタマイズした表示順序を優先）

### ソート可能なフィールド

1. **displayOrder** (デフォルト)
2. **name**: カテゴリ名
3. **createdAt**: 作成日時

## 権限管理

### 参照権限のルール

1. **一覧取得**: ログインユーザーに関連付けられたカテゴリのみ取得
2. **単体取得**: ログインユーザーに関連付けられたカテゴリのみ取得（関連がない場合は404）
3. **非表示カテゴリ**: `includeHidden=false`で`is_visible=true`のみ取得

## エラーハンドリング設計

### Effect-TSを使用した型安全なエラーハンドリング

```typescript
Effect.Effect<Result, Error>
```

### エラーの流れ

1. アプリケーション層: タグ付きエラーを生成
2. プレゼンテーション層: HTTPステータスコードにマッピング

## テスト戦略

### ユニットテスト

- ListCategoriesUseCase: 10テスト（正常系5 + 異常系5）
- GetCategoryUseCase: 8テスト（正常系3 + 異常系5）

## 技術スタック

- **フレームワーク**: Hono + tRPC
- **ORM**: Drizzle ORM
- **エラーハンドリング**: Effect-TS
- **バリデーション**: Zod
- **DI**: InversifyJS
- **テスト**: Vitest

## 参考資料

- [Issue #10](https://github.com/Masaya-j9/account-book-monorepo/issues/10)
