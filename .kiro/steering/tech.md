# 技術スタック

## アーキテクチャ

シングルプロセスの Node.js サーバー（`server.js`）が静的ファイルを提供し、同じ HTTP サーバー上に `ws` ベースの WebSocket サーバーを紐付けてリアルタイム通信を実現しています。ルームはサーバー側のメモリ（Map）で管理され、水平スケール時は外部 pub/sub（例: Redis）での中継が必要になります。

## コア技術

- **言語**: JavaScript (Node.js)
- **フレームワーク**: Express（静的ファイル配信と HTTP サーバー）
- **WebSocket**: `ws`（同一プロセス内でのリアルタイム通信）

## 主要ライブラリ

- `express` — ルーティングと静的配信
- `ws` — WebSocket サーバー
- `crypto`（Node 標準）— ルーム ID / ユーザー ID 生成

## 開発基準（現状）

- プロジェクトは純粋な JavaScript（CommonJS）で実装されており、型チェックやテストは現状含まれていません。
- スタイルや lint の設定は未検出。必要なら ESLint/Prettier の導入を提案します。

## 実行 / 共通コマンド

```powershell
# 開発/起動
npm install
npm start   # node server.js
```

## 重要な技術的決定

- ルーム・投票はサーバー側メモリで管理（再起動で消える設計）
- 投票の公開・リセットはルームのオーナーのみ許可（権限チェックをサーバー側で実施）
- WebSocket を HTTP サーバーと同一ポートで動かす設計（デプロイ時に有利）
- Graceful shutdown を実装し、SIGINT/SIGTERM を受けて ws/server を閉じる処理がある

---

運用面では、永続化や複数インスタンス運用が必要になれば設計変更（状態の外部化、pub/sub）を検討してください。
