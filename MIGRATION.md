# 移行・開発環境の再開

このアプリはビルド不要の静的Webアプリです。移行元は
<https://github.com/xxxkouxxx/roastlog-labeler> です。
正本・作業境界は `AGENTS.md`、引き継ぎ情報は `NEXT_SESSION.md` を確認してください。

## 移行前のデータ保存

- 公開データは `labels.json`、生豆テンプレートは `beans_import.js` / `beans_import.json` にあります。
- 私用の豆インベントリは、使用しているブラウザの `localStorage` の `roastlog_beans` に保存されます。GitHubには保存されません。
- 移行元の管理画面で「バックアップ・テンプレート」→「データ書き出し」を押し、`roastlog_backup_YYYY-MM-DD.json` を保管してください。このファイルは `.gitignore` の対象です。移行先へ別途コピーしてください。
- 「データ書き出し」の対象は豆インベントリです。公開ラベルのローカル下書き（`roastlog_public_labels_draft`）と公開URL設定（`roastlog_public_app_url`）は含まれません。未公開の下書きがある場合は、移行元で内容を確認・保存してから移行してください。
- ブラウザの保存データはURLのオリジン（プロトコル・ホスト・ポート）ごとに異なります。復元は実際に使用するURLで行ってください。

## 移行先の環境

Git、Python 3、Node.jsを用意します。PythonはローカルHTTPサーバ、Node.jsは回帰検証に使用します。GitHub CLIは認証やリポジトリ操作に使う場合だけ必要です。npmパッケージのインストールは不要です。

移行先の任意の作業フォルダで実行します。

```powershell
git clone https://github.com/xxxkouxxx/roastlog-labeler.git
cd roastlog-labeler
node scripts/test_labeler.js
python -m http.server 8765 --bind 127.0.0.1
```

ブラウザで <http://127.0.0.1:8765/> を開きます。サーバは `Ctrl+C` で終了できます。
Windowsで `python` が見つからない場合は、Pythonの導入状態を確認し、Python Launcherが利用できれば `py -3` を使用してください。

Tailwind CSS、アイコン、QR生成、3D表示などは外部CDNを利用します。画面の利用にはインターネット接続が必要です。

## データの復元と確認

1. 移行先の管理画面で「データを読み込む」を押し、保存したバックアップJSONを選択します。読み込みは移行先の豆インベントリを置き換えるため、既存データがある場合は先に書き出してください。
2. 豆の件数、焙煎日、産地補足、ラベルの内容と寸法を確認します。
3. 公開URL設定を使用していた場合は、移行元と同じ値を設定します。既定の公開URLは <https://xxxkouxxx.github.io/roastlog-labeler/> です。
4. 2D/3Dプレビュー、PNG保存、公開ラベルのQR表示をブラウザで確認します。実機印刷とスマホ実機での確認は別途行います。

`node scripts/test_labeler.js` の成功はローカル回帰検証です。ブラウザ描画、WebGL、プリンタ、GitHub Pagesへの反映を確認したことにはなりません。

## テンプレートの再生成が必要な場合

通常の移行では既存の `beans_import.js` と `beans_import.json` を使用します。
`scripts/bean_info_to_import_json.js` の既定入力は移行元の `G:\マイドライブ\KaffelogicProfiles` です。移行先で再生成する場合は実在する入力フォルダを明示してください。入力が存在しなくても空のJSONを出力するため、既存ファイルを直接出力先にせず、別ファイルに生成して内容を確認してください。

```powershell
node scripts/bean_info_to_import_json.js "C:\path\to\KaffelogicProfiles" "C:\path\to\beans_import.preview.json"
```

このスクリプトはJSONのみを生成します。`beans_import.js` の更新・公開は別の作業です。

## GitHubへの保存

公開に必要なアプリ・素材・公開JSONと、開発再開に必要なスクリプト・文書・プロジェクトスキルを目的ごとに選んでコミットします。個人用バックアップは別途移行してください。
staging・commit・pushは依頼された範囲で実行し、`git add -A` は使用しません。
push後はGitHub側のコミットを確認します。GitHub Pagesでの画面確認は別途必要です。
