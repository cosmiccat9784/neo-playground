const canvas = document.getElementById("snake");
const ctx = canvas.getContext("2d");

const els = {
  startBtn: document.getElementById("start-btn"),
  startOverlay: document.getElementById("start-overlay"),
  overlayTitle: document.getElementById("overlay-title"),
  overlaySubtitle: document.getElementById("overlay-subtitle"),
  stateEl: document.getElementById("state"),
  scoreEl: document.getElementById("score"),
  lengthEl: document.getElementById("length"),
  resetBtn: document.getElementById("reset-btn"),
  pauseBtn: document.getElementById("pause-btn"),
};

const tile = 20;
const cols = Math.floor(canvas.width / tile);
const rows = Math.floor(canvas.height / tile);

const state = {
  snake: [],
  direction: { x: 1, y: 0 },
  nextDirection: { x: 1, y: 0 },
  food: { x: 10, y: 10 },
  running: false,
  paused: false,
  score: 0,
  lastTime: performance.now(),
  accumulator: 0,
  speed: 8,
};

const setStatus = (text) => {
  els.stateEl.textContent = text;
};

const setOverlay = (title, subtitle, buttonText) => {
  els.overlayTitle.textContent = title;
  els.overlaySubtitle.textContent = subtitle;
  els.startBtn.textContent = buttonText;
};

const showOverlay = () => {
  els.startOverlay.classList.remove("hidden");
};

const hideOverlay = () => {
  els.startOverlay.classList.add("hidden");
};

const updateHud = () => {
  els.scoreEl.textContent = state.score.toString();
  els.lengthEl.textContent = state.snake.length.toString();
};

const isOnSnake = (x, y) => state.snake.some((part) => part.x === x && part.y === y);

const spawnFood = () => {
  let x = 0;
  let y = 0;
  do {
    x = Math.floor(Math.random() * cols);
    y = Math.floor(Math.random() * rows);
  } while (isOnSnake(x, y));
  state.food = { x, y };
};

const resetGame = () => {
  state.snake = [
    { x: 6, y: 10 },
    { x: 5, y: 10 },
    { x: 4, y: 10 },
    { x: 3, y: 10 },
  ];
  state.direction = { x: 1, y: 0 };
  state.nextDirection = { x: 1, y: 0 };
  state.score = 0;
  state.speed = 8;
  state.running = false;
  state.paused = false;
  state.accumulator = 0;
  spawnFood();
  updateHud();
  setStatus("Ready");
  setOverlay("Ready to slither?", "Arrow keys to move. Avoid the walls.", "Start Game");
  showOverlay();
  els.pauseBtn.textContent = "Pause";
};

const step = () => {
  const head = state.snake[0];
  const dir = state.nextDirection;

  if (
    (state.direction.x + dir.x !== 0 || state.direction.y + dir.y !== 0) &&
    (dir.x !== 0 || dir.y !== 0)
  ) {
    state.direction = dir;
  }

  const next = { x: head.x + state.direction.x, y: head.y + state.direction.y };

  if (next.x < 0 || next.x >= cols || next.y < 0 || next.y >= rows) {
    state.running = false;
    setStatus("Crashed");
    setOverlay("Game over", "You hit the wall.", "Play Again");
    showOverlay();
    return;
  }

  if (isOnSnake(next.x, next.y)) {
    state.running = false;
    setStatus("Crashed");
    setOverlay("Game over", "You hit yourself.", "Play Again");
    showOverlay();
    return;
  }

  state.snake.unshift(next);

  if (next.x === state.food.x && next.y === state.food.y) {
    state.score += 10;
    if (state.snake.length % 5 === 0) {
      state.speed += 1;
    }
    spawnFood();
    updateHud();
  } else {
    state.snake.pop();
  }
};

const update = (dt) => {
  if (!state.running || state.paused) {
    return;
  }
  state.accumulator += dt;
  const stepTime = 1 / state.speed;
  while (state.accumulator >= stepTime) {
    step();
    state.accumulator -= stepTime;
  }
};

const draw = () => {
  ctx.fillStyle = "#0b0a13";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ff62f8";
  ctx.beginPath();
  ctx.arc(
    state.food.x * tile + tile / 2,
    state.food.y * tile + tile / 2,
    tile / 3,
    0,
    Math.PI * 2
  );
  ctx.fill();

  state.snake.forEach((part, index) => {
    ctx.fillStyle = index === 0 ? "#8efbff" : "rgba(142, 251, 255, 0.7)";
    ctx.fillRect(part.x * tile + 2, part.y * tile + 2, tile - 4, tile - 4);
  });
};

const loop = (timestamp) => {
  const dt = (timestamp - state.lastTime) / 1000;
  state.lastTime = timestamp;
  update(dt);
  draw();
  requestAnimationFrame(loop);
};

const startGame = () => {
  if (!state.running) {
    if (els.overlayTitle.textContent.includes("Game over")) {
      resetGame();
    }
    state.running = true;
  }
  state.paused = false;
  setStatus("Running");
  hideOverlay();
  els.pauseBtn.textContent = "Pause";
};

els.startBtn.addEventListener("click", startGame);
els.startOverlay.addEventListener("click", (event) => {
  if (event.target === els.startOverlay) {
    startGame();
  }
});

els.resetBtn.addEventListener("click", () => resetGame());
els.pauseBtn.addEventListener("click", () => {
  if (!state.running) {
    return;
  }
  state.paused = !state.paused;
  if (state.paused) {
    setStatus("Paused");
    setOverlay("Paused", "Take a breather.", "Resume");
    showOverlay();
    els.pauseBtn.textContent = "Resume";
  } else {
    setStatus("Running");
    hideOverlay();
    els.pauseBtn.textContent = "Pause";
  }
});

window.addEventListener("keydown", (event) => {
  const key = event.key;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
    event.preventDefault();
  }
  if (key === "ArrowUp") {
    state.nextDirection = { x: 0, y: -1 };
  } else if (key === "ArrowDown") {
    state.nextDirection = { x: 0, y: 1 };
  } else if (key === "ArrowLeft") {
    state.nextDirection = { x: -1, y: 0 };
  } else if (key === "ArrowRight") {
    state.nextDirection = { x: 1, y: 0 };
  }
});

resetGame();
requestAnimationFrame(loop);
