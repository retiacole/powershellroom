# 開発・修正の進め方

powershellroom は、一般的な IT トラブルシューティングを題材にする、単一 HTML の学習用シミュレーターです。windowsCLIroom と同じ操作感を保ち、PowerShell のオブジェクトとパイプラインを学べることを重視します。

## ローカルで動かす

Node.js 22 以降を使用します。

```sh
npm ci
npm run build
npm test
```

画面の確認は `powershellroom.html` をブラウザーで開きます。`src/ui.html` はビルド用テンプレートであり、単独では教材として動きません。

ブラウザーの自動確認には Playwright を使います。

```sh
npx playwright install chromium
npm run test:browser
```

macOS / Linux でインストール済みの Chrome を使う場合：

```sh
PSR_BROWSER_CHANNEL=chrome npm run test:browser
```

Windows PowerShell でインストール済みの Chrome を使う場合：

```powershell
$env:PSR_BROWSER_CHANNEL = 'chrome'
npm run test:browser
```

## 編集する場所

| 対象 | ファイル |
| --- | --- |
| 説明、例、ヒント、解釈問題、採点条件 | `src/data.js` |
| 構文、パイプ、変数、仮想ファイル | `src/shell.js` |
| プロセス、サービス、ネットワークの架空モデル | `src/network.js` |
| 採点用の証拠、進捗の読み込み | `src/engine.js` |
| 画面、入力、表示言語、保存操作 | `src/app.js`、`src/style.css`、`src/ui.html` |

ビルド済み HTML を直接直すと次のビルドで消えます。ソースを編集し、`npm run build` で `powershellroom.html`、`docs/index.html`、`docs/powershellroom.html` をまとめて更新します。3 ファイルは同じ内容を保ちます。

## 教材と採点の方針

- 説明・課題・ヒント・解釈問題は日本語と英語をそろえます。
- 学習者が見た解答例をそのまま入力して完了できることを確認します。
- 指定した IP・ファイル・プロパティを部分一致で採点しません。
- 結果の文字列だけでなく、実行したコマンド、パイプのつながり、最終状態を照合します。
- コマンドを指定することが学習の目的なら課題文にも明記します。目的を満たす別解を許容する場合は、必要な状態や項目で照合します。
- 失敗を観察する課題では、対象の操作とエラーが実際に発生したことを確認します。
- `-WhatIf` と実行、過去のログと現在の状態、DNS・TCP・HTTP の確認範囲を区別します。
- 円記号を区切りに変換するのはパスの入力部分だけです。本文・検索語・URL は書き換えません。
- 進捗の変更では、既存の保存データと読み込み失敗時の保護を確認します。

コマンド処理はブラウザー内の仮想環境で完結させます。実 OS のコマンド実行やネットワーク要求を追加する設計ではありません。

## 修正後の確認

変更箇所に対応するテストを実行します。採点や構文を修正した場合は、正しい例だけでなく、誤答・別解・保存後の復元を確認します。画面や教材を変更した場合は、ビルド済み HTML でも確認してください。

更新時には [CHANGELOG](CHANGELOG.md) に利用者に影響する変更を記載します。[VALIDATION](VALIDATION.md) には、その版で実際に実行した確認と未確認の範囲を記載します。バージョンは `package.json`・固定ファイル・教材データ・画面表示で一致させます。

GitHub での公開作業は [PUBLISHING](PUBLISHING.md) に分けています。コミット、push、リポジトリの公開設定、Pages の有効化はそれぞれ別の操作です。
