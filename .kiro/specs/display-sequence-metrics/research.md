# Research & Decisions — display-sequence-metrics

## Summary

- **Feature**: display-sequence-metrics
- **Discovery Scope**: Simple Addition / Extension (既存の reveal フローへの小さな拡張)
- **Key Findings**:
  - 既存の `revealVotes` / `votesRevealed` フローが存在するため、サーバー側での拡張が最小コストで実装可能。
  - クライアント側は受信 → 表示ロジックの追加のみで済むため、UI 変更は軽微。
  - `"?"` は文字列として扱われるためサーバーで厳密に除外する設計が簡潔で安全。

## Research Log

### 既存メッセージと統合

- **Context**: 既存アプリは `ws` で `votesRevealed` を送信している。
- **Sources Consulted**: リポジトリ内 `server.js`, `public/app.js` を参照。
- **Findings**: `votesRevealed` に `metrics` フィールドを追加することで後方互換性を保てる。
- **Implications**: クライアントは `metrics` が無ければ従来どおり振る舞い、存在すれば表示する条件分岐を持てばよい。

## Architecture Pattern Evaluation

| Option                      | Description                      | Strengths                  | Risks / Limitations                    |
| --------------------------- | -------------------------------- | -------------------------- | -------------------------------------- |
| Server-side augmented event | サーバーで算出してイベントに付与 | 一貫性・単一責務・実装容易 | 大規模データで遅延の懸念（だが想定外） |

## Design Decisions

### Decision: サーバー側で算出してイベントに付与

- **Context**: 全クライアントに一貫した算出結果を配信する必要がある。
- **Alternatives**:
  1. クライアント側で算出 — クライアント差異の危険
  2. サーバー側で算出 — 一貫性を保てる（選択）
- **Rationale**: 単純で後方互換性に優れる。既存 `broadcastToRoom` を再利用できる。
- **Trade-offs**: サーバー負荷が増加するが、ルームサイズは通常小さいため受容可能。

## Risks & Mitigations

- 大規模ルームで遅延 → ベンチマーク後、中央値アルゴを改良（O(n)選択アルゴリズム）または処理を非同期化する。

## References

- repository: `server.js`, `public/app.js` (local scan)
