# デプロイ手順 (簡易)

このファイルはこの `planning-poker` アプリを様々なプラットフォームにデプロイするための最小手順をまとめたものです。

前提
- Node.js の依存をインストール済みであること（`npm install`）。
- リモート環境では `PORT` 環境変数を使って受け取る（`server.js` は `process.env.PORT` を使用）。

1) Render / Heroku / Railway 等（簡易）

- リポジトリを GitHub に push
- Render / Heroku / Railway で新しい Web Service を作成し、リポジトリを接続
- Build 命令は標準で `npm install`、Start コマンドは `npm start`（Procfile を提供済み）

2) Docker を使ってデプロイ

- ローカルでビルド・実行（PowerShell）:

```powershell
docker build -t planning-poker:latest .
docker run -p 3000:3000 -e PORT=3000 planning-poker:latest
```

- Fly.io / Docker Hub / Azure Container Instances など、コンテナを受け付けるサービスに push してデプロイできます。

3) GitHub Actions で自動デプロイ (例)

- リポジトリに `Dockerfile` と `Procfile` があれば多くのプロバイダで自動ビルド可能です。GitHub Actions を使って Registry に push し、対象ホストにデプロイするワークフローを作成してください。

ローカル検証

1. 依存をインストール

```powershell
npm install
```

2. サーバー起動

```powershell
npm start
```

3. ブラウザで開く: http://localhost:3000

備考
- 永続化は未対応（サーバー再起動でルーム情報は消えます）。
- 本リポジトリには最小限のセキュリティ対策しかありません。公開環境では HTTPS、認証、rate-limit、CORS 設定等を検討してください。
