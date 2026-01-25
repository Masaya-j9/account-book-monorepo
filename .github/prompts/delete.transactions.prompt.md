# 実行計画

## 課題
取引（transactions）の論理削除（soft delete）をバックエンドで実装する。

## 方針
- 既存の deleted_at を利用し、Use Case + Router + OpenAPI + 共有スキーマを追加する。
- 削除対象の存在確認と所有者チェックを行い、論理削除を実行する。
- 既存のテスト規約に合わせてユニットテストを追加する。

## 作業項目
- [x] 取引削除の共有スキーマ（input/output）を追加
- [x] 取引削除用のユースケース/エラー/テストを実装
- [x] tRPC ルーターと OpenAPI に削除エンドポイントを追加
- [x] DI トークン/コンテナを更新
- [x] 影響範囲のテストを実行

## 実施結果
- テスト: `cd apps/backend && pnpm test:run -- --runInBand`
