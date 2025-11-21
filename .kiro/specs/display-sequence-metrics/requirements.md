1. 機能概要

When ルームが作成され、そのルームの `sequenceType` が `fibonacci` または `natural` に設定されているとき, the system shall 投票公開（`revealed`）時に中央値と平均を算出し表示するための処理を行う。

2. 中央値と平均値の表示（既存カード内）

When 投票が `revealed` になったとき and the room `sequenceType` is `fibonacci` or `natural`, the system shall 投票値のうち `"?"` と明示されたエントリを除外して中央値（median）と算術平均（mean）を計算し、既存の「投票が公開されました！」カード内に当該値を表示する。

When 既存の「投票が公開されました！」カードが表示されたとき, the system shall そのカード内の中央値・平均の表示を次のトーストが来るまで保持し、明示的に上書かれるか別のトーストが来るまで表示し続ける（永続表示）。

3. "?" の扱い

When 投票配列に `"?"` が含まれているとき, the system shall それらを計算対象から除外し、トースト内に除外数（例: "除外: 2 件"）を表示する。

4. 実行条件（スコープ制限）

When ルームの `sequenceType` が `fibonacci` でも `natural` でもないとき, the system shall 投票公開時に中央値・平均の算出やトースト表示を行わない。

5. パフォーマンス目標

When 投票が `revealed` になったとき and the room `sequenceType` is `fibonacci` or `natural`, the system shall 統計算出とカード内表示を 200ms 以下で完了することを目標とする（小〜中規模の部屋の場合）。

6. 受け入れ基準（EARS 形式）

When ルーム作成時に `sequenceType` が `fibonacci` に設定され、投票に数値と `"?"` が混在するデータセットが与えられたとき, the system shall 既存の「投票が公開されました！」カード内で中央値・平均を表示し、`"?"` は除外されて算出されていること（表示は次のトーストが来るまで維持されること。受け入れ条件: 表示された中央値・平均が手計算の期待値と一致すること）。

When ルーム作成時に `sequenceType` が `natural` に設定され、投票に数値と `"?"` が混在するデータセットが与えられたとき, the system shall 同様に既存カード内で中央値・平均を表示し、`"?"` は除外されて算出されていること（表示は次のトーストが来るまで維持されること）。

When ルームの `sequenceType` が `other`（fibonacci でも natural でもない）であるとき, the system shall 投票公開時に中央値・平均のカード内表示を行わないこと。

--
この文書は `/kiro-spec-requirements` フェーズに基づき EARS 形式で生成・更新されました。次のステップは設計フェーズです。
