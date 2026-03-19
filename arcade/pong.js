const canvas = document.getElementById("pong");
const ctx = canvas.getContext("2d");

const els = {
  startBtn: document.getElementById("start-btn"),
  startOverlay: document.getElementById("start-overlay"),
  overlayTitle: document.getElementById("overlay-title"),
  overlaySubtitle: document.getElementById("overlay-subtitle"),
  stateEl: document.getElementById("state"),
  scoreLeft: document.getElementById("score-left"),
  scoreRight: document.getElementById("score-right"),
  resetBtn: document.getElementById("reset-btn"),
  pauseBtn: document.getElementById("pause-btn"),
};

const state = {
  running: false,
  paused: false,
  lastTime: performance.now(),
  keys: new Set(),
  scoreLeft: 0,
  scoreRight: 0,
  paddleLeft: { x: 24, y: 180, w: 12, h: 90, speed: 320 },
  paddleRight: { x: 784, y: 180, w: 12, h: 90, speed: 360 },
  ball: { x: 410, y: 230, r: 8, vx: 280, vy: 180 },
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const resetBall = (serveToRight = true) => {
  state.ball.x = canvas.width / 2;
  state.ball.y = canvas.height / 2;
  const direction = serveToRight ? 1 : -1;
  const angle = (Math.random() * Math.PI) / 3 - Math.PI / 6;
  const speed = 280;
  state.ball.vx = Math.cos(angle) * speed * direction;
  state.ball.vy = Math.sin(angle) * speed;
};

const resetRound = () => {
  state.paddleLeft.y = (canvas.height - state.paddleLeft.h) / 2;
  state.paddleRight.y = (canvas.height - state.paddleRight.h) / 2;
  resetBall(Math.random() > 0.5);
};

const resetGame = () => {
  state.scoreLeft = 0;
  state.scoreRight = 0;
  resetRound();
  updateScore();
  setOverlay("Ready?", "First to 11 wins. Up/Down to move.", "Start Game");
  state.running = false;
  state.paused = false;
  setStatus("Ready");
  showOverlay();
  els.pauseBtn.textContent = "Pause";
};

const updateScore = () => {
  els.scoreLeft.textContent = state.scoreLeft.toString();
  els.scoreRight.textContent = state.scoreRight.toString();
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

const isWinningScore = () => state.scoreLeft >= 11 || state.scoreRight >= 11;

const handleInput = (dt) => {
  const moveUp = state.keys.has("ArrowUp");
  const moveDown = state.keys.has("ArrowDown");
  const paddle = state.paddleRight;
  const direction = (moveDown ? 1 : 0) + (moveUp ? -1 : 0);
  paddle.y += direction * paddle.speed * dt;
  paddle.y = clamp(paddle.y, 0, canvas.height - paddle.h);
};

const updateAI = (dt) => {
  const paddle = state.paddleLeft;
  const target = state.ball.y - paddle.h / 2;
  const delta = target - paddle.y;
  const step = Math.sign(delta) * paddle.speed * 0.85 * dt;
  if (Math.abs(delta) < Math.abs(step)) {
    paddle.y = target;
  } else {
    paddle.y += step;
  }
  paddle.y = clamp(paddle.y, 0, canvas.height - paddle.h);
};

const collidePaddle = (paddle) => {
  const { ball } = state;
  if (
    ball.x + ball.r < paddle.x ||
    ball.x - ball.r > paddle.x + paddle.w ||
    ball.y + ball.r < paddle.y ||
    ball.y - ball.r > paddle.y + paddle.h
  ) {
    return false;
  }

  const hitPos = (ball.y - (paddle.y + paddle.h / 2)) / (paddle.h / 2);
  const bounce = clamp(hitPos, -1, 1) * (Math.PI / 4);
  const speed = Math.hypot(ball.vx, ball.vy) * 1.03;
  const direction = ball.x < canvas.width / 2 ? 1 : -1;

  ball.vx = Math.cos(bounce) * speed * direction;
  ball.vy = Math.sin(bounce) * speed;

  if (direction > 0) {
    ball.x = paddle.x + paddle.w + ball.r;
  } else {
    ball.x = paddle.x - ball.r;
  }
  return true;
};

const updateBall = (dt) => {
  const { ball } = state;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  if (ball.y - ball.r <= 0) {
    ball.y = ball.r;
    ball.vy *= -1;
  }
  if (ball.y + ball.r >= canvas.height) {
    ball.y = canvas.height - ball.r;
    ball.vy *= -1;
  }

  collidePaddle(state.paddleLeft);
  collidePaddle(state.paddleRight);

  if (ball.x + ball.r < 0) {
    state.scoreRight += 1;
    updateScore();
    resetRound();
  }
  if (ball.x - ball.r > canvas.width) {
    state.scoreLeft += 1;
    updateScore();
    resetRound();
  }
};

const update = (dt) => {
  if (!state.running || state.paused) {
    return;
  }
  handleInput(dt);
  updateAI(dt);
  updateBall(dt);

  if (isWinningScore()) {
    const winner = state.scoreRight > state.scoreLeft ? "You win!" : "AI wins!";
    setOverlay("Game over", winner, "Play Again");
    setStatus("Game Over");
    state.running = false;
    showOverlay();
  }
};

const drawNet = () => {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 10]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);
};

const draw = () => {
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#1a1730");
  gradient.addColorStop(1, "#0b0a13");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawNet();

  ctx.fillStyle = "#8efbff";
  ctx.fillRect(
    state.paddleLeft.x,
    state.paddleLeft.y,
    state.paddleLeft.w,
    state.paddleLeft.h
  );
  ctx.fillRect(
    state.paddleRight.x,
    state.paddleRight.y,
    state.paddleRight.w,
    state.paddleRight.h
  );

  ctx.beginPath();
  ctx.arc(state.ball.x, state.ball.y, state.ball.r, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
};

const loop = (timestamp) => {
  const dt = Math.min(0.05, (timestamp - state.lastTime) / 1000);
  state.lastTime = timestamp;
  update(dt);
  draw();
  requestAnimationFrame(loop);
};

const startGame = () => {
  if (isWinningScore()) {
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
  if (["ArrowUp", "ArrowDown"].includes(event.key)) {
    event.preventDefault();
  }
  state.keys.add(event.key);
});

window.addEventListener("keyup", (event) => {
  state.keys.delete(event.key);
});

resetGame();
requestAnimationFrame(loop);
