# プランニングポーカー (Planning Poker)

リアルタイムでチーム見積もりができるWebアプリケーションです。ログイン不要で、複数人が同時に参加できます。

## 機能 (Features)

- ✅ ログイン不要 (No login required)
- ✅ リアルタイム同期 (Real-time synchronization)
- ✅ 複数人同時参加 (Multiple participants)
- ✅ ルーム作成・参加 (Create and join rooms)
- ✅ フィボナッチ数列の投票カード (Fibonacci sequence voting cards: 0, 1, 2, 3, 5, 8, 13, 21, ?)
- ✅ 投票の公開・リセット (Reveal and reset votes)
- ✅ 参加者の投票状態表示 (Show participant voting status)

## 使い方 (Usage)

### インストール (Installation)

```bash
npm install
```

### サーバー起動 (Start Server)

```bash
npm start
```

サーバーは `http://localhost:3000` で起動します。

### 使用方法 (How to Use)

1. **ルームを作成**: 名前を入力して「新しいルームを作成」をクリック
2. **ルームに参加**: ルームIDと名前を入力して「ルームに参加」をクリック
3. **投票**: カードを選択して投票
4. **公開**: 全員が投票したら「投票を公開」をクリック
5. **リセット**: 次の見積もりのために「リセット」をクリック

## 技術スタック (Tech Stack)

- **Backend**: Node.js + Express
- **WebSocket**: ws library
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Storage**: In-memory (no database required)

## スクリーンショット (Screenshots)

### スタート画面
![Start Screen](https://github.com/user-attachments/assets/a2f199f2-4137-4fa4-8aab-c7f2e332635b)

### ルーム画面
![Room Screen](https://github.com/user-attachments/assets/55c2d934-6bfe-40ec-b0f9-476ccde84364)

### 投票後
![Voted](https://github.com/user-attachments/assets/4b6a4871-89c6-4795-9e72-59b67c3d22f9)

### 複数人参加
![Multi-user](https://github.com/user-attachments/assets/31132c76-3aba-45cf-893e-6076f54f9c6e)

## ライセンス (License)

MIT