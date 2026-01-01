# カテゴリー参照・更新API設計ドキュメント

## 概要

このドキュメントは、Issue #10「カテゴリー参照ビジネスロジック（オニオンアーキテクチャ）論点まとめ」およびIssue #15「カテゴリ更新用エンドポイント（/category）の新規実装計画」に基づいて実装されたカテゴリーAPI（カテゴリ一覧取得/単体取得/更新）の設計方針と実装詳細を記述します。

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
  - `update`: カテゴリ情報の更新
- `UpdateCategoryData`: 更新データの型定義
  - `isVisible?: boolean`: 表示/非表示
  - `customName?: string | null`: カスタム名（null可）
  - `displayOrder?: number`: 表示順

#### 2. Application Layer（アプリケーション層）
**場所**: `apps/backend/src/services/categories/`

**責務**:
- ユースケースの実装
- 入力のバリデーションと正規化
- エラーハンドリング（Effect-TSを使用）

**実装内容**:
- `ListCategoriesUseCase`: カテゴリ一覧取得のユースケース
- `GetCategoryUseCase`: カテゴリ単体取得のユースケース
- `UpdateCategoryUseCase`: カテゴリ更新のユースケース

**エラー定義（参照系）**:
- `InvalidPaginationError`: ページネーションパラメータ不正
- `InvalidSortParameterError`: ソートパラメータ不正
- `CategoryNotFoundError`: カテゴリが存在しない
- `InvalidCategoryIdError`: カテゴリID不正

**エラー定義（更新系）**:
- `CategoryNotFoundError`: カテゴリが存在しない
- `DefaultCategoryUpdateForbiddenError`: デフォルトカテゴリの更新禁止
- `InvalidUpdateDataError`: 更新データ不正
- `UnexpectedUpdateCategoryError`: 予期しないエラー

#### 3. Infrastructure Layer（インフラストラクチャ層）
**場所**: `apps/backend/src/infrastructure/repositories/`

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
- `categoryRouter.update`: カテゴリ更新エンドポイント

**エラーマッピング**:
| アプリケーションエラー | HTTPステータス |
|----------------------|---------------|
| InvalidPaginationError | 400 BAD_REQUEST |
| InvalidSortParameterError | 400 BAD_REQUEST |
| InvalidCategoryIdError | 400 BAD_REQUEST |
| InvalidUpdateDataError | 400 BAD_REQUEST |
| CategoryNotFoundError | 404 NOT_FOUND |
| DefaultCategoryUpdateForbiddenError | 403 FORBIDDEN |
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

#### カテゴリ更新（update）
- `categoryId`: 1以上の整数（必須）
- `isVisible`: boolean（任意）
- `customName`: 1〜50文字の文字列（任意、空文字はnullに正規化）
- `displayOrder`: 0以上の整数（任意）

**更新のビジネスルール**:
- デフォルトカテゴリ（`isDefault=true`）は更新不可
- 少なくとも1つのフィールドを指定する必要がある
- `customName`が空文字の場合は自動的に`null`に変換される

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
- UpdateCategoryUseCase: 10テスト（正常系5 + 異常系5）

## 技術スタック

- **フレームワーク**: Hono + tRPC
- **ORM**: Drizzle ORM
- **エラーハンドリング**: Effect-TS
- **バリデーション**: Zod
- **DI**: InversifyJS
- **テスト**: Vitest

## 参考資料

- [Issue #10](https://github.com/Masaya-j9/account-book-monorepo/issues/10)
- [Issue #15](https://github.com/Masaya-j9/account-book-monorepo/issues/15)
