# display-sequence-metrics 設計書

## Overview

この機能は、ルーム作成時に選択された配列が `fibonacci` または `natural` の場合に限り、投票公開（`revealed`）時に投票内の `"?"` を除外して中央値（median）と算術平均（mean）を算出し、既存の「投票が公開されました！」カード内に 10 秒間表示することを目的とする。対象はリアルタイム WebSocket を用いる既存アーキテクチャへの拡張であり、UI 表示は最小限のプレゼンテーション追加で実装可能である。

### Goals

- 既存の投票公開ワークフローに自然に統合すること
- `sequenceType` が `fibonacci`/`natural` のルームに限定して計算を行うこと
- 表示は既存カード内で 10 秒維持し、その後消去すること

### Non-Goals

- クライアント側での高度な統計ビジュアライゼーション（ヒストグラム等）は含めない
- ルームの `sequenceType` を動的に推定する処理は含めない

## Architecture

### Existing Architecture Analysis

- 現行は `server.js` による単一プロセス Node.js サーバ（`ws`）と `public/app.js` の静的クライアントで構成される。投票公開はサーバー側でトリガーされ、既存メッセージ（例: `revealVotes` / `votesRevealed`）が使用されている。

### Pattern & Boundary

- 選択: 小さなサーバー拡張（Backend-side Processing）
  - 理由: 中央値・平均はサーバーで正規化して一元的に算出し、全クライアントに一貫した結果を配信するため。クライアントは受け取り → 表示に専念する。
- 境界: 新規永続化は不要。処理はインメモリかつ同期的に行う想定。

## Technology Stack

| Layer     | Choice                               | Role                                                                        |
| --------- | ------------------------------------ | --------------------------------------------------------------------------- |
| Frontend  | existing `public/app.js`             | 受信したイベントを既存カードに描画し、10 秒で非表示にするロジックを追加する |
| Backend   | existing `server.js` (Node.js, `ws`) | `revealVotes` 発生時に検査して中央値/平均を算出し、イベントを送出する       |
| Messaging | WebSocket (`ws`)                     | 既存の `votesRevealed` または補助イベントで配信                             |

## System Flows

### Sequence (簡易)

1. オーナーが投票を公開 → サーバーが `revealVotes` 処理を実行
2. サーバーが当該ルームの `sequenceType` を確認（`fibonacci`/`natural` の場合のみ継続）
3. 投票配列から `"?"` を除外し、中央値・平均を算出
4. サーバーが既存の `votesRevealed` イベント（または補助イベント）に `metrics: { median, mean, excludedCount }` を付与して全クライアントへ送信
5. クライアント (`public/app.js`) が受信し、既存の「投票が公開されました！」カードに中央値・平均と除外数を表示し、10 秒後に非表示または更新する

## Requirements Traceability

| Requirement | Summary                                          | Components            | Interfaces                   | Flows                |
| ----------: | ------------------------------------------------ | --------------------- | ---------------------------- | -------------------- |
|         1.1 | ルーム作成時の `sequenceType` に応じた処理トリガ | Backend (`server.js`) | N/A                          | シーケンスフロー 2   |
|         2.1 | 中央値・平均の算出と既存カード内表示             | Backend + Frontend    | `votesRevealed` イベント拡張 | シーケンスフロー 3-5 |
|         3.1 | `"?"` の除外と除外数の通知                       | Backend → Frontend    | イベント内 `excludedCount`   | シーケンスフロー 3-5 |
|         4.1 | scope 制限（非該当時は表示しない）               | Backend               | N/A                          | シーケンスフロー 2   |
|         5.1 | パフォーマンス目標（200ms 目標）                 | Backend               | N/A                          | シーケンスフロー 2-4 |
|         6.1 | 受け入れ基準（表示 10 秒）                       | Frontend              | UI 表示                      | シーケンスフロー 5   |

## Components and Interfaces

### Backend: SequenceMetricsService (論理コンポーネント)

| Field        | Detail                                                                                 |
| ------------ | -------------------------------------------------------------------------------------- |
| Intent       | `revealVotes` 発生時に `sequenceType` を確認し、必要なら中央値・平均を算出して配信する |
| Requirements | 1.1, 2.1, 3.1, 4.1, 5.1                                                                |
| Dependencies | Room state (in-memory) — P0; WebSocket broadcast utility — P0                          |

Responsibilities & Constraints

- 投票配列から `"?"` を除外する（文字列比較で厳密に `"?"`）
- 有効な数値について算術平均と中央値を算出（中央値: ソート → 中央要素/平均: 合計/件数）
- 処理は同期的に短時間で完了することを目標とし、200ms をターゲットとする

Contracts

- Event: `votesRevealed` (existing) augmented payload example:

```json
{
  "type": "votesRevealed",
  "roomId": "ABCD12",
  "votes": { "user1": "5", "user2": "?", ... },
  "metrics": { "median": 5, "mean": 5.2, "excludedCount": 1 }
}
```

Implementation Notes

- サーバーは既存の `broadcastToRoom` を再利用してイベントを送信する。新たな外部依存は不要。

### Frontend: MetricsDisplay (UI responsibility)

| Field        | Detail                                                                                 |
| ------------ | -------------------------------------------------------------------------------------- |
| Intent       | 受信した `metrics` を既存の「投票が公開されました！」カード内に表示し、10 秒で消去する |
| Requirements | 2.1, 3.1, 6.1                                                                          |

Responsibilities & Constraints

- 受信: `public/app.js` の `handleMessage` に `votesRevealed` ハンドラを追加/拡張する
- 表示: 既存カード DOM に `median` / `mean` / `excludedCount` を描画（日本語文言）
- 挿入方法は既存 DOM 構造に対して最小差分で行うこと（ID/クラスを追加してスタイルを流用）

Contracts

- UI expects `metrics` を含む `votesRevealed` イベント。存在しない場合は何もしない。

Implementation Notes

- 10 秒タイマーはクライアント側で実装。タイマー中に別の `votesRevealed` が来たらタイマーをリセットして最新値を表示する。

## Data Models

- 新たな永続データは不要。送信イベントの `metrics` は一時的な表示用ペイロードであり、サーバー側で永続化しない。

## Error Handling

- 入力検証: サーバーは投票値を数値にパースする際に例外をキャッチし、問題のあるエントリは `excludedCount` に含める。
- フォールバック: `metrics` 算出に失敗した場合は `metrics` を送らず、既存の `votesRevealed` イベントのみ送信する（表示は行わない）。

## Testing Strategy

- Unit tests (Backend):
  - 中央値/平均の算出（偶数・奇数件、`"?"` の除外）
  - `sequenceType` が異なる場合に算出がスキップされるテスト
  - 例外パス（非数値、空配列）の取り扱い
- Integration tests:
  - `revealVotes` トリガーから `votesRevealed` のペイロードに `metrics` が含まれる end-to-end テスト
- Frontend UI tests:
  - 受信時に既存カードへ正しく表示され、10 秒で非表示になること

## Risks & Mitigations

- リスク: 大規模ルームで算出が遅延する可能性 → Mitigation: 算出は O(n log n)（中央値ソート）だが n は小〜中規模想定。必要時に O(n) の中央値アルゴリズムへ置換。
- リスク: クライアントの DOM 構造変更と競合 → Mitigation: 既存 ID を利用し最小限の差分で要素を追加。

## Supporting References

- Steering: `.kiro/steering/`（既存アーキテクチャ遵守）
