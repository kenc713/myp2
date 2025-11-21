# Implementation Plan: add-4-choice-sequence

### Major + Sub-task structure

- [x] 1. クライアント: 4 択 (A,B,C,D) UI の追加
- [x] 1.1 レンダリング: `renderCards` に `4choice` を追加して A/B/C/D を表示する
  - _Requirements: 1.1_
- [x] 1.2 選択処理: カード選択時に既存の `vote` メッセージで選択値を送信する
  - _Requirements: 1.2_
- [x] 1.3 表示: 公開時に参加者カードへ投票値を表示する UI を確認する

  - _Requirements: 1.3_

- [x] 2. サーバー: sequence の受け入れと保持
- [x] 2.1 ルーム作成: `createRoom` で `sequence: '4choice'` を受け取り `room.sequence` に保存する
  - _Requirements: 2.1_
- [x] 2.2 参加通知: `joinedRoom` / `roomCreated` メッセージに `sequence` を含めて送信する

  - _Requirements: 2.2,2.3_

- [x] 3. サーバー: 投票保存と公開
- [x] 3.1 投票保存: `vote` 受信時に `room.votes` にユーザー → 値を保存する
  - _Requirements: 4.1_
- [x] 3.2 公開送信: オーナーによる公開で `votesRevealed` を全員に送信する

  - _Requirements: 4.2_

- [x] 4. サーバー: バリデーションとエラー処理
- [x] 4.1 バリデーション: `sequence === '4choice'` の場合は vote が A|B|C|D のみ許可し、不正なら `error` を返す

  - _Requirements: 5.1,5.2_

- [x] 5. ドキュメントと回帰確認
- [x] 5.1 変更点の短い実装ノートを `CHANGELOG` または `README` に追記する
  - _Requirements: 3.1_
- [x]\* 5.2 (オプション) テスト作業: 単体/統合テストを作成（今回は小規模のため保留）
  - _Requirements: 6.1,6.2_
