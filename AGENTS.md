# AGENTS.md — プロジェクト共通リファレンス

このファイルは Codex / Claude Code など、どの開発エージェントでも同じ前提から
作業を再開できるようにするための「安定したリファレンス」です。
日々の進捗や「次に何をやるか」は [NEXT_SESSION.md](NEXT_SESSION.md) を参照してください。

## プロジェクト概要

コーヒー豆の焙煎ラベルを管理・印刷し、QRコードから公開ページで詳細を参照できる
ようにするアプリです。

- 単一ファイルの静的Webアプリ: [index.html](index.html)（Tailwind CSS + Lucide icons、ビルド不要）
- 私用の管理画面はブラウザの `localStorage`（キー: `roastlog_beans`）にデータを保存
- 公開用データは [labels.json](labels.json) として書き出し、GitHub Pages で配信
- 公開URL: `https://xxxkouxxx.github.io/roastlog-labeler/`

## なぜ labels.json が必要か（公開JSON方式）

管理アプリのデータは `localStorage` にあるため、別端末（スマホ等）でQRを開いても
同じデータは存在しません。そこで「公開用ラベルデータを `labels.json` として書き出し、
`index.html` と一緒に GitHub Pages に置く」方式を採用しています。

1. 管理画面でラベルを確定し、`labels.json add/update` ボタンで公開データを生成・更新
2. ダウンロードした `labels.json` をリポジトリの同名ファイルに置き換える
3. QRコードは `https://xxxkouxxx.github.io/roastlog-labeler/#label-<labelId>` を指す
4. 公開ページ（QRビュー）は起動時に `labels.json` を読み込み、該当ラベルIDの詳細を表示
5. 公開ページ側は閲覧専用（編集・削除はローカル側のみ）

## QR / ディープリンクの仕組み

- URLハッシュ `#label-<labelId>` を検出すると `isQrViewMode = true` になり、
  `<body>` に `qr-view` クラスを付与して編集系UIをCSSで非表示にする
  （`handleUrlDeepLink` 関数）
- 旧形式 `#label-label-...` は廃止済み（正式公開前に整理予定）

## データモデル

二つの近いが別のレコード形状があります。

- **Bean レコード**: 私用インベントリ（`localStorage`）の単位
- **Label レコード**: 公開スナップショット（`labels.json`）の単位

変換・正規化の関数:

- `normalizeBeanRecord` / `normalizeLabelRecord` — 各レコードの形を整える
- `createLabelSnapshot(bean)` — Bean から公開用 Label スナップショットを作成
- `labelToBeanRecord(label)` — Label を Bean 形状に戻す（編集時の再利用用）

`COUNTRY_OPTIONS` はコーヒー産地国（20カ国）のコード・別名一覧で、産地選択や
表示名解決に使われます。

## 産地の雰囲気を伝える仕組み（ORIGIN_STORIES / originNote）

QRから開く詳細ページで、産地の「雰囲気」を短く伝えるための仕組みです
（産地名バッジのすぐ近くに表示）。

- `ORIGIN_STORIES`（コード内の定数、国名キー） — 産地共通の紹介文。
  実在する産地について事実と異なる内容を書かないよう、初期値は空オブジェクトに
  してあります。実際の取引関係や産地情報をもとにユーザー自身で埋める想定です。
  例: `'RWANDA': 'キブ湖周辺の丘陵地で育つ豆。標高や微気候の違いが、農家ごとの個性につながっています。'`
- `originNote`（Bean / Label 共通フィールド、フォームの「産地の雰囲気・補足」欄）
  — そのロットならではの補足。`saveBean` → `normalizeBeanRecord` →
  `createLabelSnapshot` → `normalizeLabelRecord` → `labelToBeanRecord` の経路で
  一貫して保持される。
- `originStoryText(bean)` — 表示用に上記2つを合成するヘルパー。
  - **シングルオリジン**（産地が1カ国）: `ORIGIN_STORIES[国名]` + `originNote` を改行で連結
  - **ブレンド**（産地が複数カ国）: 各国の紹介文を積み上げると長くなり「短く表示」という
    意図に反するため、`ORIGIN_STORIES` は使わず `originNote` のみを表示する。
    ブレンドならではの話は `originNote` にまとめて書いてもらう

表示先は `updateUIState` 内、`#detail-origin-story` 要素（空なら `hidden`）。

## 公開フロー（GitHub Pages への反映）

1. 管理画面で焙煎ロットを選択し、焙煎日・焙煎度・挽き方・内容量・メモ・
   テイストプロファイルを確認する
2. ラベル操作の「`labels.json add/update`」ボタンを押す
3. ダウンロードされた `labels.json` をリポジトリの `labels.json` と置き換える
4. 公開に必要なファイルだけをコミット＆プッシュする
   - `index.html` … アプリ自体を変更したとき
   - `labels.json` … 公開ラベルデータを変更したとき
   - `beans_import.js` … 生豆テンプレートを変更したときのみ
5. GitHub Pages の更新後、公開QR URLで表示を確認する

## 日次のラベル更新チェックリスト

1. アプリでラベルを作成・編集する
2. 「`labels.json add/update`」ボタンを押す
3. 最新の `labels.json` をこのリポジトリに移動／上書きする
4. ラベル件数とラベルIDを確認する
5. コミット: `git add labels.json` → `git commit -m "Update public labels"`
6. プッシュ: `git push`
7. コピーした公開URLをPCまたはiPhoneで開いて確認する

## 公開ラベルURLの形式

短縮ハッシュ形式を使用します。

```text
https://xxxkouxxx.github.io/roastlog-labeler/#label-1780642536293-20260605
```

## 開発時の注意

- コミットは目的別に小さくまとめる（例: アプリ変更は `index.html` のみ、
  ラベルデータ変更は `labels.json` のみ）。すべてをまとめて `git add -A` しない
- `ORIGIN_STORIES` には実在の産地について事実と異なる内容を書かない
- ブラウザでの動作確認はローカルHTTPサーバ（例: `python -m http.server`）と
  ブラウザ操作ツールを使う
