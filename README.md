# けんぴこ！

スマホで遊べる、15秒の「おうちから飛び出すキャラクター」を叩くミニゲームです。

## ローカルで遊ぶ

### 1. Pythonを用意
Python 3.10以上を推奨。

### 2. 依存関係をインストール

```bash
pip install -r requirements.txt
```

### 3. 起動

```bash
python app.py
```

### 4. ブラウザで開く

```text
http://127.0.0.1:5000
```

スマホから同じWi-Fi経由で遊ぶ場合は、PCのローカルIPを使って
`http://PCのIPアドレス:5000` を開いてください。

## Renderで公開

GitHubへこのフォルダをアップロードしてRenderでWeb Serviceを作成します。

- Build Command: `pip install -r requirements.txt`
- Start Command: `gunicorn app:app`

`render.yaml` も入れてあります。

## ゲーム仕様

- ゲーム名：けんぴこ！
- 制限時間：15秒
- 家：3×3
- 1 HIT：10点
- 連続HITでコンボ
- MISSでコンボリセット
- ハイスコアはlocalStorage保存
- 参考画像そのもののキャラクター画像を使用
- ハンマーはタッチした場所にだけ出現
- タッチ座標から「どの家を叩いたか」を判定
- キャラクターが出ている家だけHIT
- pointerdown対応でスマホ・PC両対応
