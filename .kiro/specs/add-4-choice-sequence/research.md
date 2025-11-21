# Research Log: add-4-choice-sequence

## Summary

分類: Simple Addition（既存アーキテクチャの小さな拡張）。対象は UI と WebSocket メッセージ契約の最小変更で十分。

## Sources Checked

- `server.js` — ルーム管理と `sequence` の既存扱いを確認。
- `public/app.js` — `renderCards`, シーケンス選択ラジオボタン、`vote` メッセージ処理を確認。
- Steering: `tech.md`, `structure.md` — 単一プロセス、メモリ保持、互換性方針を確認。

## Key Findings

- `server.js` は `rooms` に `sequence` を保存するコードパスを既に受け入れている（`createRoom` に sequence を渡している）。最小修正で対応可能。
- `public/app.js` の `renderCards` は sequence を受け取り動的レンダリングするため、`getSequenceValues` に `4choice` を追加すれば UI 側の対応は軽微。
- 既存のメッセージ `roomCreated` / `joinedRoom` は `sequence` を含める実装になっているため、プロトコル変更は最小限で済む。

## Decisions & Rationale

- 実装はサーバーとクライアント双方に最小の変更を加える方針（低リスク、互換性重視）。
- バリデーションはサーバー側で行い、不正値は拒否してクライアントに `error` を返す（Fail Fast + 観測性確保）。

## Risks & Mitigations

- リスク: フロントの DOM 変更が既存スクリプトに影響する可能性。  
  緩和: 既存 ID/クラスを変更せずにラジオ選択肢を追加する。回帰テストを実施。
- リスク: 将来のシーケンス拡張に備えた設計ではない。  
  緩和: 将来的にはシーケンス定義をデータ駆動で外部化する計画を検討。

## Next Steps

1. 実装パッチ: `public/app.js` に `4choice` を追加、`server.js` に受信バリデーションを追加。
2. 単体テスト追加: `createRoom` と `submitVote` のバリデーション。
3. レビュー & 承認後に設計を `design.md` として確定し、タスク生成へ移行。
