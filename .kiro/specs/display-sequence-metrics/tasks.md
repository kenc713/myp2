# Implementation Tasks for display-sequence-metrics

## Major tasks

- [x] 1.  Backend: `revealVotes` における metrics 算出と送信

- 1.1 実装: ルームの `sequenceType` を確認して `fibonacci` / `natural` の場合のみ処理を継続する
- 1.2 実装: 投票配列から `"?"` を除外して算術平均（mean）と中央値（median）を算出する
- 1.3 実装: 既存の `votesRevealed` イベントに `metrics: { median, mean, excludedCount }` を付与して `broadcastToRoom` で配信する
- _Requirements: 1,2,3,4,5,6_

- [x] 2.  Frontend: 既存の「投票が公開されました！」カードへの表示ロジック追加

- 2.1 実装: `public/app.js` の `handleMessage` に `votesRevealed` ハンドラを拡張し、`metrics` があれば既存カードに描画する
- 2.2 実装: カード表示は受信後、次のトーストが来るまで保持（永続）。同一ルームで新しい `votesRevealed` を受信したら上書き表示する。
- _Requirements: 2,3,6_

- [ ] 3.  テスト: 単体・統合テストを用意する（現在はユーザー指示により保留）

- 3.1 Unit: 中央値・平均の計算ロジック（奇数/偶数件、`"?"` の除外）をテストする（保留）
- 3.2 Integration: `revealVotes` トリガーから `votesRevealed` に `metrics` が含まれて配信される E2E テストを作成する（サーバー → クライアントの受信検証）（保留）
- _Requirements: 2,3,5,6_

注: テスト作成とパフォーマンス計測は現時点でユーザー指示により保留されています。再開時にタスクを再アクティベートしてください。

- [ ] 4. ドキュメントとレビュー
  - 4.1 docs: `design.md`/`research.md` に実装ノート（実装手順、既知の制約、パフォーマンス注意点）を追加してレビューワーに通知する
  - 4.2 code review: 変更を PR にまとめ、レビューチェックリスト（動作確認手順）を用意する
  - _Requirements: 1,2_

## 見積りと並列実行

- 合計: 4 major tasks、各サブタスクは 1–3 時間程度を想定
- 並列可: `2.1` と `3.1` は並列実行可能 (P)

--
作成済みタスクを確認後、私が実装パッチ（`server.js` と `public/app.js` の最小変更）を作成しますか？
