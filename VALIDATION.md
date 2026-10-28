# powershellroom v0.1.0 の確認記録

2026-10-28 / macOS / Node.js 24 / Playwright 1.62.1 + Chrome

## 結果

- `node build.js`：成功。単一 HTML と `docs/` の 2 ファイルは同一内容。
- `node --test tests/*.test.js`：114 件成功、失敗 0 件（レビュー対応後に再実行）。
- `PSR_BROWSER_CHANNEL=chrome npm run test:browser`：成功。
- 5 コース・50 レッスンの初期状態が不合格、実際の解答例が合格になることを確認。保存したセッションでも判定を復元。
- ブラウザーに表示した日本語の解答例を読み取って実行し、全 50 レッスンの合格を確認。20 問の解釈問題について、誤答 40 選択肢の不合格と個別解説も確認。
- 引用パス、末尾選択、ブロック形式、`200MB`、DNS の位置指定、HTTP HEAD、パイプでの停止・開始など、12 通りの別解をブラウザーの入力欄から実行して合格を確認。パイプ入力による採点結果は再読込後も保持。
- Node 上では、`200MB` / `204800KB` / `0.1953125GB` の同値、引数順、`Select-Object Name/Id` を経由する変更も確認。しきい値・演算子・対象の違い、構文エラー、WhatIf のみ、変更後の再観察漏れは不合格。
- 修正前のソースで生成した全 50 レッスンの解答済み進捗を、修正後の読み込み処理へ渡して再採点。保存構造の読み込みと合格状態の維持を確認。
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

## 配布 HTML の SHA-256

`powershellroom.html`、`docs/index.html`、`docs/powershellroom.html`：

```text
5720759656dc6d55a27544ba6ecf774c2ec0313d7cac939792b275142f0d84b6
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
