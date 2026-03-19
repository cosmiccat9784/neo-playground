const canvas = document.getElementById("pacman");
const ctx = canvas.getContext("2d");

const els = {
  startBtn: document.getElementById("start-btn"),
  startOverlay: document.getElementById("start-overlay"),
  overlayTitle: document.getElementById("overlay-title"),
  overlaySubtitle: document.getElementById("overlay-subtitle"),
  stateEl: document.getElementById("state"),
  scoreEl: document.getElementById("score"),
  livesEl: document.getElementById("lives"),
  pelletsEl: document.getElementById("pellets"),
  resetBtn: document.getElementById("reset-btn"),
  pauseBtn: document.getElementById("pause-btn"),
};

const map = [
  "###################",
  "#........#........#",
  "#.####...#...####.#",
  "#........#........#",
  "#.###.#######.###.#",
  "#.................#",
  "#.###.#.#####.#.###",
  "#.....#.....#.....#",
  "#.###.#.#####.#.###",
  "#.................#",
  "#.###.#######.###.#",
  "#........#........#",
  "#.####...#...####.#",
  "#........#........#",
  "###################",
];

const tile = 20;
const rows = map.length;
const cols = map[0].length;
const boardWidth = cols * tile;
const boardHeight = rows * tile;
const offsetX = Math.floor((canvas.width - boardWidth) / 2);
const offsetY = Math.floor((canvas.height - boardHeight) / 2);

const state = {
  running: false,
  paused: false,
  score: 0,
  lives: 3,
  pellets: 0,
  lastTime: performance.now(),
  accumulator: 0,
  speed: 8,
  player: { x: 9, y: 13, dir: { x: 0, y: -1 }, next: { x: 0, y: -1 } },
  ghost: { x: 9, y: 7, dir: { x: 0, y: 1 } },
  pelletsMap: [],
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
  els.livesEl.textContent = state.lives.toString();
  els.pelletsEl.textContent = state.pellets.toString();
};

const isWall = (x, y) => {
  if (x < 0 || x >= cols || y < 0 || y >= rows) {
    return true;
  }
  return map[y][x] === "#";
};

const resetPellets = () => {
  state.pelletsMap = map.map((row) => row.split("").map((cell) => cell === "."));
  let count = 0;
  state.pelletsMap.forEach((row) => {
    row.forEach((cell) => {
      if (cell) {
        count += 1;
      }
    });
  });
  state.pellets = count;
};

const resetPositions = () => {
  state.player.x = 9;
  state.player.y = 13;
  state.player.dir = { x: 0, y: -1 };
  state.player.next = { x: 0, y: -1 };
  state.ghost.x = 9;
  state.ghost.y = 7;
  state.ghost.dir = { x: 0, y: 1 };
};

const resetGame = () => {
  state.running = false;
  state.paused = false;
  state.score = 0;
  state.lives = 3;
  state.accumulator = 0;
  resetPositions();
  resetPellets();
  updateHud();
  setStatus("Ready");
  setOverlay("Ready?", "Arrow keys to move. Clear the maze.", "Start Game");
  showOverlay();
  els.pauseBtn.textContent = "Pause";
};

const availableDirs = (entity) => {
  const options = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];
  return options.filter((dir) => !isWall(entity.x + dir.x, entity.y + dir.y));
};

const applyNextDirection = () => {
  const next = state.player.next;
  if (!isWall(state.player.x + next.x, state.player.y + next.y)) {
    state.player.dir = next;
  }
};

const moveEntity = (entity) => {
  const nextX = entity.x + entity.dir.x;
  const nextY = entity.y + entity.dir.y;
  if (isWall(nextX, nextY)) {
    return;
  }
  entity.x = nextX;
  entity.y = nextY;
};

const moveGhost = () => {
  const options = availableDirs(state.ghost);
  const reverse = { x: -state.ghost.dir.x, y: -state.ghost.dir.y };
  const viable = options.filter((dir) => dir.x !== reverse.x || dir.y !== reverse.y);
  if (!viable.length) {
    state.ghost.dir = reverse;
  } else if (viable.length > 1) {
    state.ghost.dir = viable[Math.floor(Math.random() * viable.length)];
  }
  moveEntity(state.ghost);
};

const eatPellet = () => {
  if (state.pelletsMap[state.player.y][state.player.x]) {
    state.pelletsMap[state.player.y][state.player.x] = false;
    state.pellets -= 1;
    state.score += 10;
    updateHud();
  }
};

const checkCollision = () => {
  if (state.player.x === state.ghost.x && state.player.y === state.ghost.y) {
    state.lives -= 1;
    updateHud();
    if (state.lives <= 0) {
      state.running = false;
      setStatus("Game Over");
      setOverlay("Game over", "The ghost caught you.", "Play Again");
      showOverlay();
    } else {
      state.running = false;
      setStatus("Caught");
      setOverlay("Caught!", "Press Start to continue.", "Continue");
      showOverlay();
      resetPositions();
    }
  }
};

const update = (dt) => {
  if (!state.running || state.paused) {
    return;
  }
  state.accumulator += dt;
  const stepTime = 1 / state.speed;
  while (state.accumulator >= stepTime) {
    applyNextDirection();
    moveEntity(state.player);
    eatPellet();
    moveGhost();
    checkCollision();
    state.accumulator -= stepTime;
    if (state.pellets <= 0) {
      state.running = false;
      setStatus("Cleared");
      setOverlay("You win!", "All pellets cleared.", "Play Again");
      showOverlay();
      break;
    }
  }
};

const draw = () => {
  ctx.fillStyle = "#0b0a13";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(77, 232, 255, 0.18)";
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (map[y][x] === "#") {
        ctx.fillRect(offsetX + x * tile, offsetY + y * tile, tile, tile);
      }
    }
  }

  ctx.fillStyle = "#ffd36a";
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (state.pelletsMap[y][x]) {
        ctx.beginPath();
        ctx.arc(
          offsetX + x * tile + tile / 2,
          offsetY + y * tile + tile / 2,
          3,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
  }

  ctx.fillStyle = "#ffd36a";
  ctx.beginPath();
  ctx.arc(
    offsetX + state.player.x * tile + tile / 2,
    offsetY + state.player.y * tile + tile / 2,
    tile / 2 - 2,
    0.25 * Math.PI,
    1.75 * Math.PI
  );
  ctx.lineTo(
    offsetX + state.player.x * tile + tile / 2,
    offsetY + state.player.y * tile + tile / 2
  );
  ctx.fill();

  ctx.fillStyle = "#ff62f8";
  ctx.beginPath();
  ctx.arc(
    offsetX + state.ghost.x * tile + tile / 2,
    offsetY + state.ghost.y * tile + tile / 2,
    tile / 2 - 2,
    0,
    Math.PI * 2
  );
  ctx.fill();
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
    if (els.overlayTitle.textContent.includes("Game over") || state.pellets <= 0) {
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
    state.player.next = { x: 0, y: -1 };
  } else if (key === "ArrowDown") {
    state.player.next = { x: 0, y: 1 };
  } else if (key === "ArrowLeft") {
    state.player.next = { x: -1, y: 0 };
  } else if (key === "ArrowRight") {
    state.player.next = { x: 1, y: 0 };
  }
});

resetGame();
requestAnimationFrame(loop);
