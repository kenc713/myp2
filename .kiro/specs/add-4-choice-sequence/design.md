# Design: add-4-choice-sequence

## Overview

この機能はクライアントとサーバーに「4 択（A, B, C, D）」の選択肢セットを追加し、既存の投票フローと互換性を保ちながら利用可能にすることを目的とします。対象ユーザーはプランニングポーカーの参加者で、短い選択肢（A/B/C/D）で意思決定を行います。

### Goals

- クライアントに 4 択カードを追加して選択・送信できるようにする。
- サーバーが `sequence: '4choice'` を保持・配信し、既存メッセージプロトコルとの互換性を維持する。
- 不正な投票値を検知して拒否するバリデーションをサーバー側に実装する。

### Non-Goals

- 投票集計の高度な分析や永続化の導入（現状はメモリ保持のまま）。

## Architecture

### Classification

簡単な UI + サーバー拡張の「Simple Addition」。既存のアーキテクチャ（単一 Node.js プロセス、`ws`、静的 `public/` クライアント）をそのまま拡張します。

### Architecture Pattern & Boundary Map

- 選択肢の追加は UI 表示層とサーバーのメッセージ契約に限定され、データ永続化や新サービスは不要。
- 既存のルームモデル（`rooms` Map）を拡張して `sequence` が '4choice' を許容する。

## Technology Stack (影響範囲のみ)

| Layer    | Choice / Version             | Role                       |
| -------- | ---------------------------- | -------------------------- |
| Frontend | Vanilla JS (`public/app.js`) | UI 表示と WebSocket 通信   |
| Backend  | Node.js + Express + `ws`     | ルーム管理とメッセージ処理 |
| Data     | In-memory (`Map`)            | ルーム・投票の一時保持     |

## Requirements Traceability

| Requirement | Summary                          | Components           | Interfaces                     |
| ----------- | -------------------------------- | -------------------- | ------------------------------ |
| 1.1         | 4 択カードを表示する             | Client UI            | renderCards(sequence)          |
| 1.2         | カード選択で送信する             | Client UI, WebSocket | `vote` メッセージ              |
| 1.3         | 公開状態で投票値を表示           | Client UI            | `votesRevealed`                |
| 2.1         | ルームに `sequence` を保存       | Server (rooms)       | room creation API (createRoom) |
| 2.2         | 参加時に sequence を送信         | Server               | `joinedRoom` message           |
| 2.3         | roomCreated に sequence を含める | Server               | `roomCreated` message          |
| 3.1         | 既存互換性の維持                 | Server, Client       | `sequence` optional            |
| 4.1         | 投票保存（ユーザー → 値）        | Server (votes Map)   | internal mapping               |
| 4.2         | 投票公開で votesRevealed 送信    | Server               | `votesRevealed`                |
| 5.1         | 不正値を拒否                     | Server               | validation on `vote`           |
| 6.1         | テスト手順の提供                 | QA                   | manual / unit tests            |

## Components and Interfaces

### Client: 4ChoiceCards (Presentation + Interaction)

| Field        | Detail                                                    |
| ------------ | --------------------------------------------------------- |
| Intent       | 4 択（A,B,C,D）を表示し、選択を送信する UI コンポーネント |
| Requirements | 1.1, 1.2, 1.3                                             |

Responsibilities & Constraints

- クライアントは `sequence` に応じてカードセットをレンダリングする（既存の `renderCards(sequence)` を拡張）。
- 選択時は既存の `vote` メッセージ形式を使ってサーバーへ送信する（文字列 'A'|'B'|'C'|'D'）。

Contracts

- Event: `vote` → payload `{ type: 'vote', vote: string }`（vote は A|B|C|D など）

Implementation Notes

- `getSequenceValues('4choice')` を追加し、`renderCards` がこれを参照するようにする。
- 互換性のため既存シーケンス（fibonacci, natural）に影響を与えない。UI は sequence のラジオ選択肢に '4choice' を追加する。

### Server: Sequence Support & Validation

| Field        | Detail                                                                      |
| ------------ | --------------------------------------------------------------------------- |
| Intent       | ルームに `sequence: '4choice'` を保存し、投票値のバリデーションと配信を行う |
| Requirements | 2.1, 2.2, 2.3, 5.1, 4.1, 4.2                                                |

Responsibilities & Constraints

- ルーム作成時に `sequence` フィールドを受け取り、`rooms.set(roomId, { ..., sequence })` に保存する（既存コードに追記）。
- `vote` メッセージ受信時に、ルームの `sequence` が '4choice' の場合は受け取れる値を `A,B,C,D` のみ許可する。それ以外は `type: 'error'` を返す。

Service Interface (conceptual)

```typescript
interface RoomService {
  createRoom(opts: { userId: string; sequence?: string }): Room;
  joinRoom(roomId: string, userId: string): RoomState;
  submitVote(roomId: string, userId: string, vote: string): void;
}
```

API / Message Contracts

- `roomCreated` / `joinedRoom`: include `sequence: string` (optional, string)
- `vote` (client→server): `{ type: 'vote', vote: string }` where `vote` ∈ allowed values for sequence
- `votesRevealed` (server→clients): `{ type: 'votesRevealed', votes: { [userId]: string } }`

## Data Models

### Room (delta)

- `room.sequence: string` — 既存の room オブジェクトに追加。例: 'fibonacci', 'natural', '4choice'
- `room.votes: Map<userId, string>` — 既存のマップ。4choice の値は 'A'|'B'|'C'|'D'

## Error Handling

- Invalid vote: サーバーは `ws.send({ type: 'error', message: 'Invalid vote value' })` を返し、値を保存しない（Fail Fast）。
- Missing sequence: サーバーはデフォルトで 'fibonacci' を設定し、エラーを返さない（互換性維持）。

## Testing Strategy

- Unit tests: `createRoom` における `sequence` の保存、`submitVote` のバリデーション（A-D の許可／拒否）を追加。
- Integration test: 手動または E2E で「ルーム作成(4choice) → 参加 → 各参加者投票 → 公開」で期待通りに表示されることを検証。

## Open Questions / Risks

- UI ラジオ選択肢の追加は既存 DOM ID に影響を与えない想定だが、フロントの要素名変更は破壊的になりうるため注意。
- 将来、選択肢セットを動的に管理したい場合はシーケンス定義を外部化する必要がある（拡張性の検討項目）。

## Supporting References

- 既存実装: `server.js`, `public/app.js` — これらに最小限の変更を加える設計。
