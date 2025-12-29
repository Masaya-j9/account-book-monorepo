## 開発

リポジトリルートで依存を入れた上で起動します。

```shell
# repo root
npm install

# backend だけ起動
npm run dev --filter=backend
```

起動後:

- http://localhost:4000

## ビルド / 起動

```shell
# repo root
npm run build --filter=backend

# build 後に起動（backend ワークスペースで実行）
npm -w backend run start
```
