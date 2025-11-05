## 目的
このリポジトリはシンプルなリアルタイム「プランニングポーカー」アプリです。バックエンドは Node.js + Express、WebSocket は `ws` を使い、フロントエンドはバニラ HTML/CSS/JS（`public/`）で実装されています。AI エージェントはまずこの「構造・通信パターン・差し替えポイント」を理解すると即戦力になります。

## すぐに役立つ要点（高レベル）
- サーバー起点: `server.js` が HTTP サーバーを立ち上げ、同じサーバーに WebSocket.Server を紐付けています（同一ポート、デプロイ時に重要）。
- ルーム管理: すべてメモリ上。`rooms: Map<roomId, { users: Map<userId, ws>, votes: Map<userId, vote>, revealed: boolean }>`。
- メッセージ型: フロント→サーバーは JSON で `type` フィールドを送る（主要な type: `createRoom`, `joinRoom`, `vote`, `revealVotes`, `resetVotes`）。レスポンス／通知も `type` を使う（例: `roomCreated`, `joinedRoom`, `voteUpdated`, `votesRevealed`, `votesReset`, `error`）。
- フロント実装: `public/app.js` が DOM 操作と WS ロジックを持ち、ページ内の要素 ID／クラスに強く依存します（例: `#createRoomBtn`, `#cardsContainer`, `#participantsList` など）。

## 開発ワークフロー（重要なコマンド）
- 依存インストール: `npm install`（`package.json` を参照）。
- サーバー起動: `npm start`（内部は `node server.js`、`dev` スクリプトは同じ挙動）。
- 実行環境: デフォルトで `http://localhost:3000`。

備考: リポジトリには既存のタスクランナーやテストは含まれていません。ホットリロードなどは直接は用意されていないため、必要なら `nodemon` を使うことを提案してください（追加変更は PR で）。

## 典型的な変更パターン（具体例）
- 新しい WebSocket メッセージを追加する場合: `server.js` の `handleMessage` スイッチに新しい case を追加し、必要に応じて `broadcastToRoom` を呼ぶ。フロント側は `public/app.js` の `handleMessage` と送信箇所（`ws.send(JSON.stringify({...}))`）を合わせて編集する。
- 永続化を入れる場合: `rooms` をファイル／DB に置き換えるのではなく、まず `rooms` の作成・破棄ロジックをラップする小さなストレージ API 層を `server.js` の上部に抽出すると影響範囲が小さい。
- スケールさせる場合: 現在は単一プロセスの `ws` に依存。複数インスタンスで動かすなら外部 pub/sub（Redis 等）でイベントを中継する必要があります。`

## デバッグと観測ポイント
- コンソールログ: `server.js` は接続・切断・パースエラーをログ出力する。まずサーバーコンソール（PowerShell）を確認。
- ブラウザ: `http://localhost:3000` を開き、デベロッパーツールのコンソールで WS の送受信 JSON を確認。
- 再現手順例: 1) `npm start` 2) ブラウザ A で作成 3) ブラウザ B で参加 4) カードを押して `vote` メッセージを確認。

## プロジェクト固有の慣習／注意事項
- 認証なし設計: ユーザーは名前だけで参加。`userId` はサーバー側で `generateUserId()` により作られる（`timestamp-random` 形式）。仕様変更は認証／ID を追加する影響がフロントとバックエンド双方に及ぶ。
- ルームID 仕様: `generateRoomId()` は `crypto.randomBytes(3).toString('hex').toUpperCase()`（6 文字の英数字）。フロントは `roomId` を大文字化して送信している（`roomIdInput.value.trim().toUpperCase()`）のでケース感度に注意。
- 投票表示フロー: 投票値はサーバー側で `room.revealed` が true のときのみクライアントに送られる。つまり「投票済み」フラグと実際の値は切り分けられている。
- データ損失: サーバー再起動で全ルーム・投票は消える（意図的）。永続化が必要な変更は最初に要件確認を行う。

## 参考ファイル（重要な場所）
- サーバー実装: `server.js`（メッセージ処理、room 管理、ws ブロードキャスト）
- フロント実装: `public/app.js`（WS 接続、DOM ID/クラス、UI イベント）、`public/index.html`（主要要素 ID）、`public/styles.css`（見た目）
- メタ情報: `package.json`（スクリプトと依存）

## 典型的な短いコード例（メッセージの形）
- クライアントがルーム作成を要求するペイロード:
  { "type": "createRoom", "userName": "太郎" }
- サーバーが投票を公開するときに送る通知:
  { "type": "votesRevealed", "votes": { "userId-1": "5", "userId-2": "8" } }

## 何を期待してほしいか（AI エージェント向け）
- 変更はまず `server.js` と `public/app.js` の両方を確認すること。片側だけ編集するとプロトコル不一致が発生しやすい。
- 既存の DOM ID とメッセージ `type` 名は事実上の API 契約なので安易に変更しない。変更が必要な場合は双方の修正を同時に行い、動作手順（前の「再現手順例」）で確認する。

## その他
### コミットメッセージ
- 日本語で生成すること。
- conventional commitsスタイルを使うことを推奨。
    - <prefix>: <description>のスタイルを使うこと。
    - prefiは、次から選ぶこと：feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert 
