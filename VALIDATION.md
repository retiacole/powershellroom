# powershellroom v0.1.1 の確認記録

2026-10-28 / macOS / Node.js 24 / Playwright 1.62.1 + Chrome

以下は v0.1.1 のローカル配布版で実施した確認です。

## 結果

- `node build.js`：成功。単一 HTML と `docs/` の 2 ファイルは同一内容。
- `node --test tests/*.test.js`：146 件成功、失敗 0 件（追加レビュー対応後に再実行）。
- `PSR_BROWSER_CHANNEL=chrome npm run test:browser`：成功。
- 5 コース・50 レッスンの初期状態が不合格、実際の解答例が合格になることを確認。保存したセッションでも判定を復元。
- ブラウザーに表示した日本語の解答例を読み取って実行し、全 50 レッスンの合格を確認。20 問の解釈問題について、誤答 40 選択肢の不合格と個別解説も確認。
- 引用パス、末尾選択、ブロック形式、`200MB`、DNS の位置指定、HTTP HEAD、名前指定・パイプでの停止・開始など、25 通りの別解をブラウザーの入力欄から実行して合格を確認。パイプ入力による採点結果は再読込後も保持。
- `Stop-Process -Name` の大文字・小文字差、ワイルドカード、Name を選んだパイプ入力に対応。実際の対象 ID を記録・採点し、WhatIf、別対象、事前確認・再観察の不足は不合格。
- 日英の未達条件チェックリストで、パイプの途中経過、別々の実行では未達のままであること、変更再実行後の再観察を確認。
- 全角構文文字、Where のブレース忘れ、未引用の空白、CMD 系入力への案内、一意なパラメーター略記と曖昧候補、位置指定を確認。引用された日本語・全角文字は保持。
- プロセス 14 件・サービス 15 件・イベント 12 件の独立状態、重複プロセス名と固有 ID、FileSystem の既定列・LastWriteTime の並べ替えと更新・旧保存補完を確認。
- Measure-Object は PowerShell 7.3 以降の通常設定に合わせ、欠落プロパティを持つ項目を Count・Sum・Average から除外。
- Process の Name・WS・Handles・SI の値と AliasProperty 表示、Get-Member の MemberType 順、Format-List の既定・全項目・明示項目の違い、余分な位置引数のエラー文を確認。
- Node 上では、`200MB` / `204800KB` / `0.1953125GB` の同値、引数順、`Select-Object Name/Id` を経由する変更も確認。しきい値・演算子・対象の違い、構文エラー、WhatIf のみ、変更後の再観察漏れは不合格。
- 公開版のソースで生成した全 50 レッスンの解答済み進捗を、修正後の読み込み処理へ渡して再採点。保存構造の読み込みと合格状態の維持を確認。旧版の Process 型変数にも不足する別名・表示用項目を補い、取得済みの値と現在のプロセス停止状態を保持。
- パスを扱う解答はバックスラッシュ・円記号・全角円記号・スラッシュでも確認。日本語と英語の表示、見本の挿入、言語変更時の入力途中のコマンド保持を確認。
- 実際のオブジェクトのプロパティ、数値と文字列、型と件数を保持するパイプを確認。ブラウザーの「処理の流れ」でも項目を閲覧。
- CSV の引用符、読み戻し、数値への変換、JSON の型、変数、二重引用符のスカラー補間を確認。表示用データを CSV に渡す誤りは説明付きで拒否。
- `-WhatIf` と実行を区別。名前変更の移動先指定、無効なリダイレクト先、未対応オプション・構文で不適切な変更を起こさないことを確認。
- 名前解決失敗、TCP 接続失敗、HTTP 503 を分離。503 の通常エラーと `-SkipHttpErrorCheck` の応答取得を確認。
- 問題のリセット後は現在の合格状態が消え、ファイル・履歴・入力・回答・ヒントが初期化されることを確認。ほかの問題と過去の完了記録を保持し、過去の完了と現在の状態を区別して表示。
- 進捗の書き出し・読み込み、再読み込み後の復元、不正な JSON の拒否、windowsCLIroom の保存領域との独立を確認。
- IME 確定、履歴、補完、右矢印での移動を確認。390px / 768px / 1440px の表示で横へのはみ出しなし。
- HTML を `file:` で開き、ネットワークを無効にしても実行可能。教材の外部通信要求と JavaScript エラーは 0 件。

ブラウザーテストは一時プロファイルで実行し、普段使うブラウザーの進捗には触れていません。

## 初回公開時の確認（追加修正前）

2026-10-28。[公開リポジトリ](https://github.com/retiacole/powershellroom)に初回公開版を反映し、GitHub Pages の公開元を `main` / `/docs` に設定しました。[公開ページ](https://retiacole.github.io/powershellroom/)の表示を Chrome で確認しました。当時、公開 URL から取得した HTML は初回公開版の配布ファイルとバイト単位で一致しました（SHA-256: `5720759656dc6d55a27544ba6ecf774c2ec0313d7cac939792b275142f0d84b6`）。

README に日英の利用リンクを追加し、[プロフィール](https://github.com/retiacole)の「その他のプロジェクト / Other projects」に windowsCLIroom と並べて掲載しました。

## v0.1.1 配布 HTML の SHA-256

`powershellroom.html`、`docs/index.html`、`docs/powershellroom.html`：

```text
ed15002d8f847ae4224c786cdebcb8b23b06b33155a6bd653fac5e1415d64fa1
```

## 確認していない範囲

実機の Windows 11 / PowerShell 7 との手動比較は未実施です。この教材は書式と動作を限定したシミュレーターです。すべての PowerShell 構文・型・エラー・画面表示の再現を目的にはしていません。制限と参考資料は [README](README.md) を参照してください。

配布用 HTML、GitHub Pages 用の `docs/`、ソース、依存関係の固定ファイル、テスト、公開用文書を同梱しています。公開先と更新の手順は [PUBLISHING](PUBLISHING.md) を参照してください。

## 文書準備の確認

2026-10-28。初回の文書準備では、README の件数・コース名・対応コマンド、相対リンクと添付プレビューを確認し、未対応構文や `ConvertTo-Json -Depth` の制限を追記しました。その後のレビュー対応で教材・採点・表示を修正し、上記の実行確認を更新しています。

## レビュー対応で照合した資料

- サービスの既定表示は [Get-Service](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-service?view=powershell-7.5)、型・プロパティ・メソッドの表示は [Get-Member](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/get-member?view=powershell-7.5) を参照。
- パイプからのプロパティ名による受け渡しは [Start-Service の Name](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/start-service?view=powershell-7.5#-name) と [Stop-Process の Id](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/stop-process?view=powershell-7.5#-id) を参照。
- 末尾選択は [Select-Object](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/select-object?view=powershell-7.5)、削除予告の文面は [ShouldProcess の解説](https://learn.microsoft.com/en-us/powershell/scripting/learn/deep-dives/everything-about-shouldprocess?view=powershell-7.5) を参照。
- Process の別名・既定表示セットは [PowerShell の型定義](https://github.com/PowerShell/PowerShell/blob/master/src/System.Management.Automation/engine/TypeTable_Types_Ps1Xml.cs)、名前指定とパイプ束縛は [Stop-Process](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/stop-process?view=powershell-7.5) を参照。

- Measure-Object の版差は [公式 Notes](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/measure-object?view=powershell-7.5#notes)、位置指定は [Select-String](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/select-string?view=powershell-7.5) と [Get-WinEvent](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.diagnostics/get-winevent?view=powershell-7.5) を参照。
