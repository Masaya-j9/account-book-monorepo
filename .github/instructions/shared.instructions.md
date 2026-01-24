---
applyTo: "packages/shared/**,packages/db/**"
---
# GitHub Copilot Instructions（Shared）

## 対象

- `packages/shared`: 共有型定義とユーティリティ
- `packages/db`: DB スキーマ/エンティティ定義

## 共有型（packages/shared）ガードレール

- 共有型はフロントエンド/バックエンドの双方で利用できる設計にする
- API の入出力は Zod スキーマで定義し、`.input(...)` / `.output(...)` を使って責務を分離する
- 破壊的変更（型の削除・型の狭め）は原則避け、必要な場合は段階的移行を検討する
- `any` / `unknown` は使用しない（必要な場合は型ガードやジェネリクスで吸収する）
- マジックナンバーは定数化し、用途が分かる名前を付ける

## DB エンティティ（packages/db）ガードレール

- スキーマ変更は `packages/db/src/schema/**` に集約する
- 既存テーブルの変更はマイグレーションと同時に実施する（`packages/db/drizzle/**`）
- 共有型へ DB 固有の型（ORM/Driver 型）を漏らさない
- DB 由来の nullable は明示的に型へ反映し、アプリ層では正規化する
- エンティティ名/カラム名は一貫した命名規則に従う（snake_case / pluralization などは既存に合わせる）

## 依存関係

- `packages/shared` はアプリケーション層/インフラ層に依存しない
- `packages/db` は DB 実装のみに閉じ、ドメイン層の型定義へは直接依存しない
