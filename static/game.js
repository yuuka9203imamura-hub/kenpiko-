(() => {
  "use strict";

  const GAME_TIME = 15;
  const HIGH_SCORE_KEY = "kenpiko_high_score_v1";
  const FIELD_COUNT = 9;

  const titleScreen = document.getElementById("titleScreen");
  const gameScreen = document.getElementById("gameScreen");
  const gameOverScreen = document.getElementById("gameOverScreen");
  const field = document.getElementById("field");
  const hammer = document.getElementById("hammer");

  const scoreEl = document.getElementById("score");
  const timerEl = document.getElementById("timer");
  const comboEl = document.getElementById("combo");
  const finalScoreEl = document.getElementById("finalScore");
  const bestScoreEl = document.getElementById("bestScore");
  const titleHighScoreEl = document.getElementById("titleHighScore");
  const newRecordEl = document.getElementById("newRecord");

  const startButton = document.getElementById("startButton");
  const retryButton = document.getElementById("retryButton");
  const backButton = document.getElementById("backButton");
  const titleHighScoreButton = document.getElementById("titleHighScoreButton");

  let score = 0;
  let combo = 0;
  let activeHouseIndex = -1;
  let gameRunning = false;
  let endAt = 0;
  let timerId = null;
  let spawnTimer = null;
  let popTimer = null;
  let lastPointerTime = 0;

  const houses = [];

  function getHighScore() {
    return Number(localStorage.getItem(HIGH_SCORE_KEY) || 0);
  }

  function setHighScore(value) {
    localStorage.setItem(HIGH_SCORE_KEY, String(value));
  }

  function updateTitleScore() {
    titleHighScoreEl.textContent = `${getHighScore()}点`;
  }

  function createCharacter() {
    const el = document.createElement("div");
    el.className = "character pop";

    // 参考画像そのものをゲーム中のキャラクターとして使用。
    const img = document.createElement("img");
    img.src = "/static/character-normal.png";
    img.alt = "";
    img.draggable = false;

    el.appendChild(img);
    return el;
  }

  function createHouse(index) {
    const house = document.createElement("div");
    house.className = "house";
    house.dataset.index = String(index);

    const roofColors = ["#ef5c51", "#55a8e6", "#f3c63c"];
    house.style.setProperty("--roof", roofColors[index % 3]);

    house.innerHTML = `
      <div class="house-roof"></div>
      <div class="house-wall"></div>
      <div class="house-window"></div>
      <div class="house-ground"></div>
    `;

    field.appendChild(house);
    houses.push(house);
  }

  function buildField() {
    field.innerHTML = "";
    houses.length = 0;
    for (let i = 0; i < FIELD_COUNT; i++) {
      createHouse(i);
    }
  }

  function clearCharacter() {
    houses.forEach(house => {
      const char = house.querySelector(".character");
      if (char) char.remove();
    });
    activeHouseIndex = -1;
  }

  function spawnCharacter() {
    if (!gameRunning) return;

    clearCharacter();

    const nextIndex = Math.floor(Math.random() * houses.length);
    activeHouseIndex = nextIndex;

    const char = createCharacter();
    houses[nextIndex].appendChild(char);

    // 少しだけ出現時間に揺らぎを持たせる
    // 出現後にしっかり叩けるよう、表示時間を約1.2〜1.9秒に設定。
    const visibleFor = 1200 + Math.random() * 700;
    popTimer = window.setTimeout(() => {
      if (!gameRunning || activeHouseIndex !== nextIndex) return;
      const current = houses[nextIndex].querySelector(".character");
      if (current) {
        current.style.animation = "popIn .32s ease-in forwards";
        window.setTimeout(() => {
          if (activeHouseIndex === nextIndex) activeHouseIndex = -1;
          current.remove();
        }, 320);
      }
    }, visibleFor);
  }

  function scheduleSpawn() {
    if (!gameRunning) return;
    const delay = 280 + Math.random() * 460;
    spawnTimer = window.setTimeout(() => {
      spawnCharacter();
      scheduleSpawn();
    }, delay);
  }

  function showPopup(id, text) {
    const el = document.getElementById(id);
    if (text !== undefined) el.textContent = text;
    el.classList.remove("hidden");
    // animation restart
    void el.offsetWidth;
    el.classList.remove("hidden");
    window.setTimeout(() => el.classList.add("hidden"), id === "comboPopup" ? 700 : 550);
  }

  function showHammer(x, y) {
    hammer.classList.remove("hidden");
    hammer.style.left = `${x}px`;
    hammer.style.top = `${y}px`;
    hammer.classList.remove("swing");
    void hammer.offsetWidth;
    hammer.classList.add("swing");

    window.setTimeout(() => {
      hammer.classList.add("hidden");
      hammer.classList.remove("swing");
    }, 230);
  }

  function hitTest(clientX, clientY) {
    // 重要：家のDOM矩形をその場で取得し、タッチ座標と直接比較する。
    // 「どの家をタッチしたか」と「キャラが出ている家」が一致した時だけHIT。
    let touchedHouse = -1;

    for (let i = 0; i < houses.length; i++) {
      const rect = houses[i].getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        touchedHouse = i;
        break;
      }
    }

    if (touchedHouse !== -1 && touchedHouse === activeHouseIndex) {
      return true;
    }
    return false;
  }

  function handlePointerDown(event) {
    if (!gameRunning) return;

    // スマホの二重発火・古いイベントを避ける
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const now = performance.now();
    if (now - lastPointerTime < 35) return;
    lastPointerTime = now;

    event.preventDefault();

    const x = event.clientX;
    const y = event.clientY;

    showHammer(x, y);

    if (hitTest(x, y)) {
      score += 10;
      combo += 1;
      scoreEl.textContent = score;
      comboEl.textContent = combo;

      clearCharacter();
      showPopup("hitPopup");

      if (combo >= 2) {
        showPopup("comboPopup", `COMBO! ×${combo}`);
      }
    } else {
      combo = 0;
      comboEl.textContent = combo;
      showPopup("missPopup");
    }
  }

  function updateTimer() {
    const remaining = Math.max(0, (endAt - performance.now()) / 1000);
    timerEl.textContent = remaining.toFixed(1);

    if (remaining <= 0) {
      endGame();
    }
  }

  function startGame() {
    window.clearInterval(timerId);
    window.clearTimeout(spawnTimer);
    window.clearTimeout(popTimer);

    score = 0;
    combo = 0;
    activeHouseIndex = -1;
    gameRunning = true;

    scoreEl.textContent = "0";
    comboEl.textContent = "0";
    timerEl.textContent = GAME_TIME.toFixed(1);

    clearCharacter();
    titleScreen.classList.add("hidden");
    gameOverScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");

    // レイアウト確定後に開始
    requestAnimationFrame(() => {
      endAt = performance.now() + GAME_TIME * 1000;
      updateTimer();
      timerId = window.setInterval(updateTimer, 50);
      spawnCharacter();
      scheduleSpawn();
    });
  }

  function endGame() {
    if (!gameRunning) return;

    gameRunning = false;
    window.clearInterval(timerId);
    window.clearTimeout(spawnTimer);
    window.clearTimeout(popTimer);
    clearCharacter();

    const oldHigh = getHighScore();
    const isNewRecord = score > oldHigh;

    if (isNewRecord) {
      setHighScore(score);
    }

    finalScoreEl.textContent = `${score}点`;
    bestScoreEl.textContent = isNewRecord ? score : oldHigh;
    newRecordEl.classList.toggle("hidden", !isNewRecord);

    hammer.classList.add("hidden");
    gameScreen.classList.add("hidden");
    gameOverScreen.classList.remove("hidden");
  }

  function backToTitle() {
    gameRunning = false;
    window.clearInterval(timerId);
    window.clearTimeout(spawnTimer);
    window.clearTimeout(popTimer);
    clearCharacter();

    gameOverScreen.classList.add("hidden");
    gameScreen.classList.add("hidden");
    titleScreen.classList.remove("hidden");
    updateTitleScore();
  }

  startButton.addEventListener("click", startGame);
  retryButton.addEventListener("click", startGame);
  backButton.addEventListener("click", backToTitle);
  titleHighScoreButton.addEventListener("click", () => {
    // ボタンは表示専用。タップ時は軽く更新して保存値を確実に反映。
    updateTitleScore();
  });

  gameScreen.addEventListener("pointerdown", handlePointerDown, { passive: false });

  buildField();
  updateTitleScore();
})();
