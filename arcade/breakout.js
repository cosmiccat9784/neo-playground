const canvas = document.getElementById("breakout");
const ctx = canvas.getContext("2d");

const els = {
  startBtn: document.getElementById("start-btn"),
  startOverlay: document.getElementById("start-overlay"),
  overlayTitle: document.getElementById("overlay-title"),
  overlaySubtitle: document.getElementById("overlay-subtitle"),
  stateEl: document.getElementById("state"),
  scoreEl: document.getElementById("score"),
  livesEl: document.getElementById("lives"),
  resetBtn: document.getElementById("reset-btn"),
  pauseBtn: document.getElementById("pause-btn"),
};

const state = {
  running: false,
  paused: false,
  lastTime: performance.now(),
  keys: new Set(),
  score: 0,
  lives: 3,
  paddle: { x: 340, y: 410, w: 140, h: 14, speed: 420 },
  ball: { x: 410, y: 360, r: 8, vx: 220, vy: -220 },
  bricks: [],
  rows: 5,
  cols: 8,
  brick: { w: 86, h: 22, gap: 10, offsetX: 50, offsetY: 60 },
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const updateHud = () => {
  els.scoreEl.textContent = state.score.toString();
  els.livesEl.textContent = state.lives.toString();
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

const resetBall = () => {
  state.ball.x = canvas.width / 2;
  state.ball.y = state.paddle.y - 20;
  const angle = (Math.random() * Math.PI) / 2 - Math.PI / 4;
  const speed = 260;
  state.ball.vx = Math.cos(angle) * speed;
  state.ball.vy = -Math.abs(Math.sin(angle) * speed);
};

const buildBricks = () => {
  const bricks = [];
  for (let row = 0; row < state.rows; row += 1) {
    for (let col = 0; col < state.cols; col += 1) {
      bricks.push({
        row,
        col,
        alive: true,
        x: state.brick.offsetX + col * (state.brick.w + state.brick.gap),
        y: state.brick.offsetY + row * (state.brick.h + state.brick.gap),
      });
    }
  }
  state.bricks = bricks;
};

const resetGame = () => {
  state.score = 0;
  state.lives = 3;
  state.running = false;
  state.paused = false;
  state.paddle.x = (canvas.width - state.paddle.w) / 2;
  buildBricks();
  resetBall();
  updateHud();
  setStatus("Ready");
  setOverlay("Ready?", "Left/Right to move. Clear all bricks.", "Start Game");
  showOverlay();
  els.pauseBtn.textContent = "Pause";
};

const allBricksCleared = () => state.bricks.every((brick) => !brick.alive);

const handleInput = (dt) => {
  const left = state.keys.has("ArrowLeft");
  const right = state.keys.has("ArrowRight");
  const direction = (right ? 1 : 0) + (left ? -1 : 0);
  state.paddle.x += direction * state.paddle.speed * dt;
  state.paddle.x = clamp(state.paddle.x, 0, canvas.width - state.paddle.w);
};

const collidePaddle = () => {
  const { ball, paddle } = state;
  if (
    ball.x + ball.r < paddle.x ||
    ball.x - ball.r > paddle.x + paddle.w ||
    ball.y + ball.r < paddle.y ||
    ball.y - ball.r > paddle.y + paddle.h
  ) {
    return false;
  }
  const hitPos = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
  const bounce = clamp(hitPos, -1, 1) * (Math.PI / 3);
  const speed = Math.hypot(ball.vx, ball.vy) * 1.02;
  ball.vx = Math.sin(bounce) * speed;
  ball.vy = -Math.cos(bounce) * speed;
  ball.y = paddle.y - ball.r - 1;
  return true;
};

const collideBricks = () => {
  const { ball } = state;
  for (const brick of state.bricks) {
    if (!brick.alive) {
      continue;
    }
    if (
      ball.x + ball.r < brick.x ||
      ball.x - ball.r > brick.x + state.brick.w ||
      ball.y + ball.r < brick.y ||
      ball.y - ball.r > brick.y + state.brick.h
    ) {
      continue;
    }
    brick.alive = false;
    state.score += 10;
    updateHud();
    ball.vy *= -1;
    return;
  }
};

const updateBall = (dt) => {
  const { ball } = state;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  if (ball.x - ball.r <= 0) {
    ball.x = ball.r;
    ball.vx *= -1;
  }
  if (ball.x + ball.r >= canvas.width) {
    ball.x = canvas.width - ball.r;
    ball.vx *= -1;
  }
  if (ball.y - ball.r <= 0) {
    ball.y = ball.r;
    ball.vy *= -1;
  }

  collidePaddle();
  collideBricks();

  if (ball.y - ball.r > canvas.height) {
    state.lives -= 1;
    updateHud();
    if (state.lives <= 0) {
      state.running = false;
      setStatus("Game Over");
      setOverlay("Game over", "Out of lives. Try again?", "Play Again");
      showOverlay();
    } else {
      resetBall();
      setStatus("Ready");
      setOverlay("Missed!", "Press Start to continue.", "Continue");
      showOverlay();
      state.running = false;
    }
  }
};

const update = (dt) => {
  if (!state.running || state.paused) {
    return;
  }
  handleInput(dt);
  updateBall(dt);
  if (allBricksCleared()) {
    state.running = false;
    setStatus("Cleared");
    setOverlay("You win!", "All bricks cleared.", "Play Again");
    showOverlay();
  }
};

const drawBackground = () => {
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#1a1730");
  gradient.addColorStop(1, "#0b0a13");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
};

const drawBricks = () => {
  state.bricks.forEach((brick) => {
    if (!brick.alive) {
      return;
    }
    const hue = 180 + brick.row * 12;
    ctx.fillStyle = `hsl(${hue}, 80%, 65%)`;
    ctx.fillRect(brick.x, brick.y, state.brick.w, state.brick.h);
  });
};

const drawPaddle = () => {
  ctx.fillStyle = "#8efbff";
  ctx.fillRect(state.paddle.x, state.paddle.y, state.paddle.w, state.paddle.h);
};

const drawBall = () => {
  ctx.beginPath();
  ctx.arc(state.ball.x, state.ball.y, state.ball.r, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
};

const draw = () => {
  drawBackground();
  drawBricks();
  drawPaddle();
  drawBall();
};

const loop = (timestamp) => {
  const dt = Math.min(0.05, (timestamp - state.lastTime) / 1000);
  state.lastTime = timestamp;
  update(dt);
  draw();
  requestAnimationFrame(loop);
};

const startGame = () => {
  if (state.lives <= 0 || allBricksCleared()) {
    resetGame();
  }
  state.running = true;
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
  if (["ArrowLeft", "ArrowRight"].includes(event.key)) {
    event.preventDefault();
  }
  state.keys.add(event.key);
});

window.addEventListener("keyup", (event) => {
  state.keys.delete(event.key);
});

resetGame();
requestAnimationFrame(loop);
