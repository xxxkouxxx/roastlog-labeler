# Next Session Notes（引き継ぎメモ）

安定したリファレンス情報（技術構成・データモデル・公開フロー・チェックリスト）は
[AGENTS.md](AGENTS.md) にまとめました。ここでは「直近やったこと／次にやること」だけを書きます。

## 直近やったこと（2026-06-07）

- QR詳細ページに「焙煎日 → 賞味期限」のエイジング進捗バー（タイムライン表示）を追加
  - `updateAgingTimeline(bean)` を新設し、`updateUIState` から呼び出し
  - 焙煎後4〜14日の「飲み頃ピーク」帯と現在地マーカーを視覚化
  - `index.html` をコミット＆プッシュ済み（"Add aging timeline bar to label detail card"）
- 「保存中の豆インベントリ」と「公開中ラベル」を開いたときに詳細パネルが
  見分けつかない問題を解消（通称タスクB）
  - 根本原因だった `openPublicLabel` / `handleUrlDeepLink` の「幽霊beanを `beans`
    配列へ注入する」バグを修正し、`viewingPublicLabelBean` という別状態に分離
  - 公開ラベル閲覧時は「🌐 公開ラベルを表示中」バッジを表示し、編集・削除・
    テンプレート作成ボタンを非表示にするよう変更（`getCurrentBean()` ヘルパー追加）
  - 「左＝インベントリ／右＝公開ステージング」という再設計案も検討したが、
    既存の `labels.json add/update` フローと噛み合わないため見送り、
    シンプルな修正（バッジ＋バグ修正）を採用
  - `index.html` をコミット＆プッシュ済み（"Stop polluting bean inventory when viewing public labels"）
- 産地の雰囲気を伝える機能を追加（[AGENTS.md](AGENTS.md) の「産地の雰囲気を伝える仕組み」参照）
  - `ORIGIN_STORIES`（産地共通の紹介文・初期値は空。事実に基づく内容をユーザーが追記する想定）
  - `originNote`（ロット個別の補足、フォームの「産地の雰囲気・補足」欄）
  - ブレンド（複数産地）は `ORIGIN_STORIES` を表示せず `originNote` のみ表示
  - `index.html` をコミット＆プッシュ済み
- 「産地の雰囲気・補足」が管理画面と公開ページでリンクして見えない問題を改善
  - ラベルデザイン画面に「QRページ（スマホ）ではこう表示されます」という確認用プレビュー（`#qr-story-preview`）を追加。物理ラベル自体には印刷せず、画面内で内容を確認できるようにした（`updateQrStoryPreview` → `generateLabelPreview` から呼び出し）
  - 公開QR詳細ページ側のコードは元々正しく繋がっていたが、`labels.json` が機能追加前のスナップショットで `originNote` を含んでいなかった。**`originNote` を入力済みのラベルは「`labels.json add/update`」で再生成し、`labels.json` を再コミット・プッシュする必要がある**（[AGENTS.md](AGENTS.md) の「日次のラベル更新チェックリスト」参照）
- Codex / Claude のどちらでも開発を続けられるように、ドキュメントを整理
  - [AGENTS.md](AGENTS.md) を新設（共通リファレンス）
  - `CLAUDE.md` は `@AGENTS.md` を読み込むだけの薄いファイルに
  - `QR_PUBLICATION_PLAN.md` は要点を AGENTS.md に吸収して削除

## 次にやること候補

- `ORIGIN_STORIES` に実在の産地情報（取引関係などに基づく事実）を追記する
- スマホでのQRページの余白調整（軽微）
- ブレンドラベルのコピー（複製）ワークフロー
- 管理画面が窮屈に感じる場合、ボタンラベルを短縮する案の検討
- 「産地の雰囲気・補足」を入力済みのラベルを `labels.json add/update` で
  再生成・再公開する（前回からの持ち越し。`originNote` がまだ `labels.json` に
  反映されていないラベルがある）

## 公開作業をするとき

[AGENTS.md](AGENTS.md) の「公開フロー」「日次のラベル更新チェックリスト」を参照してください。
