# Next Session Notes（引き継ぎメモ）

安定したリファレンス情報（技術構成・データモデル・公開フロー・チェックリスト）は
[AGENTS.md](AGENTS.md) にまとめました。ここでは「直近やったこと／次にやること」だけを書きます。

## 移行準備（2026-10-04）

- 保存対象は現在のラベルUI・2D/3Dプレビュー・PNG/印刷設定、ロゴ素材、回帰検証、開発用スクリプト、プロジェクトスキル、共通リファレンス。
- 移行先のclone・起動・データ復元手順を [MIGRATION.md](MIGRATION.md) に追加した。ビルドやnpmパッケージの追加は不要。
- `node scripts/test_labeler.js` は21項目PASS。テンプレートJSONとJSの25件が一致し、公開ラベル12件のID重複がないことを確認した。
- GitHub側の公開ラベル追加4コミットをfast-forwardで取り込み、作業中のアプリ・文書を保持した。
- 実ブラウザ、WebGL、プリンタ、スマホ実機、GitHub Pagesの画面確認は今回の移行保存作業では未実施。
- 私用の豆インベントリはGitHubには保存されない。移行元で「データ書き出し」を行い、移行先で復元する。バックアップJSONはGit除外対象。

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

## labels.json のクリーンアップ運用（2026-06-08〜）

- 開発中のテストデータやテンプレート由来のダミーラベル、削除済みの豆のラベルが
  `labels.json` / ブラウザの公開ラベルドラフト（`localStorage` の
  `roastlog_public_labels_draft`）に紛れ込むことがある
- 「`labels.json` add/update」でダウンロードしたファイルは、**そのままコミットせず
  Claude Code に添付して目視チェックしてもらう**運用にした
  - Claude 側でラベル名・産地・焙煎日・labelId を一覧化し、重複や不審なIDが
    ないか確認したうえで整理・コミットする
  - 削除した豆や旧ID版のラベルが復活しないよう、必要に応じて
    `roastlog_public_labels_draft` 側も合わせて整理する（手順はセッション内で案内）
- スキル化は見送り、「ダウンロードしたら毎回添付する」運用で進める方針に決定
- 関連の修正（コミット済み）:
  - `labelIdForBean()` をハッシュベースに変更し、テンプレート由来の説明的な
    `id` でも短いラベルIDが生成されるように修正
    （"Generate short hash-based label IDs for non-numeric bean IDs"）
  - 焙煎日が未入力のラベルは `labels.json` 書き出し時に自動的に除外する
    ガードを追加（"Skip labels without a roast date when exporting labels.json"）
