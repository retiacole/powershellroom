# 公開・更新手順

## 公開先

- リポジトリ：[retiacole/powershellroom](https://github.com/retiacole/powershellroom)（Public）
- Web 教材：GitHub Pages の `main` ブランチ・`/docs` を公開元に使用します。
- オフライン教材：リポジトリ直下の `powershellroom.html`。
- プロフィール：windowsCLIroom と同じ「その他のプロジェクト / Other projects」に掲載する、日常 IT 操作・調査の学習教材です。

`docs/` が存在しても、ローカルのビルドだけでは公開ページは更新されません。変更をコミットし、GitHub へ反映する必要があります。

`package.json` の `private: true` は npm パッケージの誤公開を防ぐ指定です。GitHub リポジトリや Pages の公開範囲を制御するものではありません。

## 更新する前に

1. [README](README.md) と [レビューガイド](REVIEW_GUIDE.md) を使い、ローカルの `powershellroom.html` を確認します。
2. 指摘をソースへ反映し、必要なテストと HTML の再ビルドを行います。
3. [確認記録](VALIDATION.md) と [変更記録](CHANGELOG.md) を更新します。

配布用 `powershellroom.html` と `docs/index.html`、`docs/powershellroom.html` の内容が一致することを確認します。`node_modules/` と `test-artifacts/` は公開対象に含めません。

## SSH で反映する

リモートは `git@github.com:retiacole/powershellroom.git` です。`git remote -v` で対象を確認し、コミット済みの変更を `git push origin main` で反映します。

1. レビュー結果、配布 HTML、バージョン、確認記録を確定します。
2. 差分を確認し、公開する変更をコミットします。
3. レビュー済みの `main` を SSH で push します。
4. Pages の公開元に `main` ブランチの `/docs` を指定します。
5. GitHub が表示する公開 URL で、日本語・英語、コマンド入力、進捗保存、スマートフォン幅の表示を確認します。公開された HTML と配布ファイルの内容が一致することも確認します。
6. 公開 URL が確認できてから README に「すぐにやってみる / Play Now」を追加し、未公開の表示を更新します。
7. プロフィール側の紹介も、内容・レッスン数などが変わった場合に更新します。

送信前のローカル確認：

```sh
git status --short
git diff --check
git remote -v
npm run build
npm test
```

GitHub Releases の作成は必須ではありません。windowsCLIroom と同じく、公開リポジトリと GitHub Pages、単一 HTML の配布を基本にしています。
