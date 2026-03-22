const getEls = () => ({
  canvas: document.getElementById("game"),
  scoreEl: document.getElementById("score"),
  timeEl: document.getElementById("time"),
  stateEl: document.getElementById("state"),
  healthEl: document.getElementById("health"),
  startBtn: document.getElementById("start-btn"),
  startOverlay: document.getElementById("start-overlay"),
  overlayTitle: document.getElementById("overlay-title"),
  overlaySubtitle: document.getElementById("overlay-subtitle"),
  resetBtn: document.getElementById("reset-btn"),
  pauseBtn: document.getElementById("pause-btn"),
  leaderboardBtn: document.getElementById("leaderboard-btn"),
  leaderboardModal: document.getElementById("leaderboard-modal"),
  leaderboardClose: document.getElementById("leaderboard-close"),
  leaderboardForm: document.getElementById("leaderboard-form"),
  leaderboardName: document.getElementById("leaderboard-name"),
  leaderboardScore: document.getElementById("leaderboard-score"),
  leaderboardList: document.getElementById("leaderboard-list"),
  leaderboardMessage: document.getElementById("leaderboard-message"),
  ratingForm: document.getElementById("rating-form"),
  ratingStars: document.getElementById("rating-stars"),
  ratingSubmit: document.getElementById("rating-submit"),
  ratingAverage: document.getElementById("rating-average"),
  ratingCount: document.getElementById("rating-count"),
});

const state = {
  player: { x: 120, y: 210, r: 18, vx: 0, vy: 0 },
  stars: [],
  asteroids: [],
  keys: new Set(),
  score: 0,
  time: 0,
  paused: false,
  running: false,
  health: 5,
  hitCooldown: 0,
  highScore: 0,
  pendingScore: null,
  saveTimer: 0,
  hasProgress: false,
  lastFrame: performance.now(),
  started: false,
};

const getAccountName = () => window.NeoAuth?.getUser()?.username || "";
const isSignedIn = () => Boolean(getAccountName());

const initElements = () => {
  const els = getEls();
  if (!els.canvas) {
    return false;
  }
  state.canvas = els.canvas;
  state.ctx = els.canvas.getContext("2d");
  Object.assign(state, els);
  if (window.NeoStore) {
    state.highScore = window.NeoStore.getHighScore("orbit-runner");
  }
  return true;
};

const STAR_COUNT = 18;
const SPEED = 220;
const ASTEROID_COUNT = 8;
const MAX_HEALTH = 5;

const createStar = () => ({
  x: Math.random() * state.canvas.width,
  y: Math.random() * state.canvas.height,
  r: 4 + Math.random() * 6,
  drift: 30 + Math.random() * 60,
});

const createAsteroid = (offset = 0) => ({
  x: state.canvas.width + Math.random() * 300 + offset,
  y: Math.random() * (state.canvas.height - 40) + 20,
  r: 12 + Math.random() * 18,
  speed: 160 + Math.random() * 140,
  drift: (Math.random() - 0.5) * 40,
  spin: (Math.random() - 0.5) * 4,
  angle: Math.random() * Math.PI * 2,
});

const setOverlay = (title, subtitle, buttonText) => {
  state.overlayTitle.textContent = title;
  state.overlaySubtitle.textContent = subtitle;
  state.startBtn.textContent = buttonText;
};

const showDebug = (message) => {
  if (!state.overlaySubtitle) {
    return;
  }
  state.overlaySubtitle.textContent = message;
};

const applyProgress = (progress) => {
  if (!progress) {
    return;
  }
  state.player.x = progress.player?.x ?? state.player.x;
  state.player.y = progress.player?.y ?? state.player.y;
  state.score = progress.score ?? 0;
  state.time = progress.time ?? 0;
  state.health = progress.health ?? MAX_HEALTH;
  state.hasProgress = true;
  updateHud();
  setOverlay("Resume run?", "Continue from your last session.", "Resume");
  state.stateEl.textContent = "Ready";
  state.startOverlay.classList.remove("hidden");
};

const saveProgress = () => {
  if (!window.NeoStore) {
    return;
  }
  window.NeoStore.saveProgress("orbit-runner", {
    score: state.score,
    time: state.time,
    health: state.health,
    player: { x: state.player.x, y: state.player.y },
  });
};

const resetGame = () => {
  state.player.x = state.canvas.width / 4;
  state.player.y = state.canvas.height / 2;
  state.player.vx = 0;
  state.player.vy = 0;
  state.score = 0;
  state.time = 0;
  state.paused = false;
  state.running = false;
  state.health = MAX_HEALTH;
  state.hitCooldown = 0;
  state.saveTimer = 0;
  state.hasProgress = false;
  state.lastFrame = performance.now();
  state.stars = Array.from({ length: STAR_COUNT }, createStar);
  state.asteroids = Array.from({ length: ASTEROID_COUNT }, (_, i) => createAsteroid(i * 120));
  updateHud();
  state.pauseBtn.textContent = "Pause";
  setOverlay("Ready to launch?", "Dodge the asteroids and survive.", "Start Game");
  state.stateEl.textContent = "Ready";
  state.startOverlay.classList.remove("hidden");
  if (state.leaderboardScore) {
    state.leaderboardScore.value = "";
  }
  if (window.NeoStore) {
    window.NeoStore.clearProgress("orbit-runner");
  }
};

const updateHud = () => {
  state.scoreEl.textContent = state.score.toString();
  state.timeEl.textContent = `${state.time.toFixed(1)}s`;
  state.healthEl.textContent = state.health.toString();
};

const openLeaderboard = () => {
  if (!state.leaderboardModal) {
    return;
  }
  state.leaderboardModal.classList.remove("hidden");
};

const closeLeaderboard = () => {
  if (!state.leaderboardModal) {
    return;
  }
  state.leaderboardModal.classList.add("hidden");
};

const renderLeaderboard = (rows) => {
  if (!state.leaderboardList) {
    return;
  }
  if (!rows.length) {
    state.leaderboardList.innerHTML = "<p class=\"modal-message\">No scores yet. Be the first.</p>";
    return;
  }
  state.leaderboardList.innerHTML = rows
    .map(
      (row, index) => `
        <div class="leaderboard-row">
          <strong>#${index + 1} ${row.username}</strong>
          <span>${row.score}</span>
        </div>
      `
    )
    .join("");
};

const loadLeaderboard = async () => {
  if (!window.NeoDB || !window.NeoDB.enabled) {
    if (state.leaderboardMessage) {
      state.leaderboardMessage.textContent = "Leaderboard is offline until Supabase is configured.";
    }
    renderLeaderboard([]);
    return;
  }
  const rows = await window.NeoDB.fetchLeaderboard("orbit-runner");
  if (state.leaderboardMessage) {
    state.leaderboardMessage.textContent = "Top pilots this week.";
  }
  renderLeaderboard(rows);
};

const syncAccountToLeaderboard = () => {
  if (!state.leaderboardName || !state.leaderboardForm) {
    return;
  }
  const username = getAccountName();
  if (username) {
    state.leaderboardName.value = username;
    state.leaderboardName.readOnly = true;
    state.leaderboardName.disabled = false;
  } else {
    state.leaderboardName.value = "";
    state.leaderboardName.readOnly = true;
    state.leaderboardName.disabled = true;
    state.leaderboardName.placeholder = "Sign in to submit";
  }
  const submitBtn = state.leaderboardForm.querySelector("button");
  if (submitBtn) {
    submitBtn.disabled = !username;
  }
};

const loadRatings = async () => {
  if (!state.ratingAverage || !state.ratingCount) {
    return;
  }
  if (!window.NeoDB || !window.NeoDB.enabled) {
    state.ratingAverage.textContent = "--";
    state.ratingCount.textContent = "Ratings offline";
    return;
  }
  const result = await window.NeoDB.fetchRatings("orbit-runner");
  if (!result.count) {
    state.ratingAverage.textContent = "--";
    state.ratingCount.textContent = "No ratings yet";
  } else {
    state.ratingAverage.textContent = result.average.toFixed(1);
    state.ratingCount.textContent = `${result.count} ratings`;
  }
};

const handleInput = (dt) => {
  const { player } = state;
  const inputX = (state.keys.has("ArrowRight") ? 1 : 0) + (state.keys.has("ArrowLeft") ? -1 : 0);
  const inputY = (state.keys.has("ArrowDown") ? 1 : 0) + (state.keys.has("ArrowUp") ? -1 : 0);

  player.vx = inputX * SPEED;
  player.vy = inputY * SPEED;

  if (state.keys.has(" ")) {
    player.vx *= 1.6;
    player.vy *= 1.6;
  }

  player.x = Math.max(player.r, Math.min(state.canvas.width - player.r, player.x + player.vx * dt));
  player.y = Math.max(player.r, Math.min(state.canvas.height - player.r, player.y + player.vy * dt));
};

const updateStars = (dt) => {
  state.stars.forEach((star) => {
    star.y += star.drift * dt;
    if (star.y - star.r > state.canvas.height) {
      star.y = -star.r;
      star.x = Math.random() * state.canvas.width;
    }
  });
};

const updateAsteroids = (dt) => {
  state.asteroids.forEach((asteroid) => {
    asteroid.x -= asteroid.speed * dt;
    asteroid.y += asteroid.drift * dt;
    asteroid.angle += asteroid.spin * dt;

    if (asteroid.y < asteroid.r) {
      asteroid.y = asteroid.r;
      asteroid.drift *= -1;
    }

    if (asteroid.y > state.canvas.height - asteroid.r) {
      asteroid.y = state.canvas.height - asteroid.r;
      asteroid.drift *= -1;
    }

    if (asteroid.x + asteroid.r < 0) {
      Object.assign(asteroid, createAsteroid());
      state.score += 1;
    }
  });
};

const handleCollisions = () => {
  if (state.hitCooldown > 0) {
    return;
  }

  const { player } = state;
  for (const asteroid of state.asteroids) {
    const dx = player.x - asteroid.x;
    const dy = player.y - asteroid.y;
    const distance = Math.hypot(dx, dy);
    if (distance < player.r + asteroid.r) {
      state.health -= 1;
      state.hitCooldown = 1;
      if (state.health <= 0) {
        state.health = 0;
        endGame();
      }
      break;
    }
  }
};

const drawBackground = () => {
  state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
  const gradient = state.ctx.createLinearGradient(0, 0, state.canvas.width, state.canvas.height);
  gradient.addColorStop(0, "#1a1730");
  gradient.addColorStop(1, "#0b0a13");
  state.ctx.fillStyle = gradient;
  state.ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);

  state.ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
  state.stars.forEach((star) => {
    state.ctx.beginPath();
    state.ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    state.ctx.fill();
  });
};

const drawAsteroids = () => {
  state.asteroids.forEach((asteroid) => {
    state.ctx.save();
    state.ctx.translate(asteroid.x, asteroid.y);
    state.ctx.rotate(asteroid.angle);
    state.ctx.beginPath();
    state.ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    state.ctx.strokeStyle = "rgba(255, 98, 248, 0.6)";
    state.ctx.lineWidth = 2;
    state.ctx.arc(0, 0, asteroid.r, 0, Math.PI * 2);
    state.ctx.fill();
    state.ctx.stroke();
    state.ctx.restore();
  });
};

const drawPlayer = () => {
  const { player } = state;
  state.ctx.beginPath();
  state.ctx.fillStyle = "#8efbff";
  state.ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
  state.ctx.fill();

  state.ctx.strokeStyle = "rgba(255, 98, 248, 0.5)";
  state.ctx.lineWidth = 3;
  state.ctx.beginPath();
  state.ctx.arc(player.x, player.y, player.r + 8, 0, Math.PI * 2);
  state.ctx.stroke();

  if (state.hitCooldown > 0) {
    state.ctx.strokeStyle = "rgba(255, 98, 248, 0.7)";
    state.ctx.lineWidth = 2;
    state.ctx.beginPath();
    state.ctx.arc(player.x, player.y, player.r + 14, 0, Math.PI * 2);
    state.ctx.stroke();
  }
};

const endGame = () => {
  state.running = false;
  state.paused = false;
  state.stateEl.textContent = "Game Over";
  const previousHigh = state.highScore;
  if (window.NeoStore) {
    state.highScore = window.NeoStore.updateHighScore("orbit-runner", state.score);
  }
  const highScoreText = state.highScore ? `High score: ${state.highScore}` : "";
  const subtitle = highScoreText ? `You took too many hits. ${highScoreText}.` : "You took too many hits. Try again?";
  setOverlay("Ship lost", subtitle, "Play Again");
  state.startOverlay.classList.remove("hidden");

  if (state.score > previousHigh && state.leaderboardScore) {
    state.pendingScore = state.score;
    state.leaderboardScore.value = state.score.toString();
    if (state.leaderboardMessage) {
      state.leaderboardMessage.textContent = "New high score! Enter your name to save it.";
    }
    openLeaderboard();
  }
  if (window.NeoStore) {
    window.NeoStore.clearProgress("orbit-runner");
  }
};

const frame = (timestamp) => {
  const delta = Math.min(0.05, (timestamp - state.lastFrame) / 1000);
  state.lastFrame = timestamp;

  if (state.running && !state.paused) {
    state.time += delta;
    state.hitCooldown = Math.max(0, state.hitCooldown - delta);
    state.saveTimer += delta;
    handleInput(delta);
    updateStars(delta);
    updateAsteroids(delta);
    handleCollisions();
    if (state.saveTimer >= 2) {
      saveProgress();
      state.saveTimer = 0;
    }
  }

  drawBackground();
  drawAsteroids();
  drawPlayer();
  updateHud();

  requestAnimationFrame(frame);
};

const shouldBlockScroll = (key) => {
  return ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(key);
};

window.addEventListener("keydown", (event) => {
  if (state.running && shouldBlockScroll(event.key)) {
    event.preventDefault();
  }
  state.keys.add(event.key);
});

window.addEventListener("keyup", (event) => {
  if (state.running && shouldBlockScroll(event.key)) {
    event.preventDefault();
  }
  state.keys.delete(event.key);
});

const startGame = () => {
  try {
    showDebug("Start clicked. Initializing...");
    if (!state.started) {
      boot();
    }
    if (!state.ctx) {
      setOverlay("Launch blocked", "Canvas failed to initialize.", "Retry");
      return;
    }
    showDebug("Launching...");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (state.overlaySubtitle) {
      state.overlaySubtitle.textContent = `Error: ${message}`;
    }
    return;
  }
  if (state.health <= 0 || (!state.running && state.time === 0 && !state.hasProgress)) {
    resetGame();
  }
  state.running = true;
  state.paused = false;
  state.lastFrame = performance.now();
  state.hasProgress = false;
  state.startBtn.textContent = "Running";
  state.pauseBtn.textContent = "Pause";
  state.stateEl.textContent = "Running";
  if (window.NeoStore) {
    window.NeoStore.updateLastPlayed("orbit-runner");
  }
  state.startOverlay.classList.add("hidden");
};

const bindEvents = () => {
  if (state.startBtn) {
    state.startBtn.addEventListener("click", startGame);
  }

  window.NeoStartGame = startGame;
  window.NeoBoot = boot;

  if (state.leaderboardBtn) {
    state.leaderboardBtn.addEventListener("click", () => {
      openLeaderboard();
      syncAccountToLeaderboard();
      loadLeaderboard();
    });
  }

  if (state.leaderboardClose) {
    state.leaderboardClose.addEventListener("click", () => {
      closeLeaderboard();
    });
  }

  if (state.leaderboardForm) {
    state.leaderboardForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const name = getAccountName();
      const score = Number(state.leaderboardScore.value);
      if (!name || !score) {
        if (state.leaderboardMessage) {
          state.leaderboardMessage.textContent = "Sign in to submit scores.";
        }
        return;
      }
      if (window.NeoDB && window.NeoDB.enabled) {
        await window.NeoDB.submitScore("orbit-runner", name, score);
        state.leaderboardName.value = name;
        state.pendingScore = null;
        await loadLeaderboard();
      }
    });
  }

  if (state.ratingStars) {
    let selectedRating = 0;
    state.ratingStars.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) {
        return;
      }
      if (!isSignedIn()) {
        if (state.ratingCount) {
          state.ratingCount.textContent = "Sign in to rate";
        }
        return;
      }
      selectedRating = Number(button.dataset.rating);
      Array.from(state.ratingStars.children).forEach((star, index) => {
        star.classList.toggle("selected", index < selectedRating);
      });
      state.ratingSubmit.disabled = !selectedRating;
      state.ratingForm.dataset.rating = selectedRating.toString();
    });

    state.ratingForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!isSignedIn()) {
        if (state.ratingCount) {
          state.ratingCount.textContent = "Sign in to rate";
        }
        return;
      }
      const rating = Number(state.ratingForm.dataset.rating || 0);
      if (!rating) {
        return;
      }
      if (window.NeoDB && window.NeoDB.enabled) {
        await window.NeoDB.submitRating("orbit-runner", getAccountName(), rating);
        state.ratingSubmit.disabled = true;
        await loadRatings();
      }
    });
  }

  state.resetBtn.addEventListener("click", resetGame);
  state.pauseBtn.addEventListener("click", () => {
    if (!state.running) {
      return;
    }
    state.paused = !state.paused;
    state.pauseBtn.textContent = state.paused ? "Resume" : "Pause";
    state.startBtn.textContent = state.paused ? "Paused" : "Running";
    state.stateEl.textContent = state.paused ? "Paused" : "Running";
    if (state.paused) {
      setOverlay("Paused", "Take a breather.", "Resume");
      state.startOverlay.classList.remove("hidden");
      saveProgress();
    } else {
      state.startOverlay.classList.add("hidden");
    }
  });

  if (state.startOverlay) {
    state.startOverlay.addEventListener("click", (event) => {
      if (event.target === state.startOverlay) {
        startGame();
      }
    });
  }
};

const boot = () => {
  if (!initElements()) {
    return;
  }
  state.started = true;
  bindEvents();
  resetGame();
  requestAnimationFrame(frame);
  loadLeaderboard();
  loadRatings();
  syncAccountToLeaderboard();
  if (window.NeoStore) {
    const progress = window.NeoStore.loadProgress("orbit-runner");
    applyProgress(progress);
  }
};

document.addEventListener(
  "click",
  (event) => {
    const button = event.target.closest("#start-btn");
    if (!button) {
      return;
    }
    event.preventDefault();
    startGame();
  },
  true
);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}

window.addEventListener("error", (event) => {
  if (state.overlaySubtitle) {
    state.overlaySubtitle.textContent = `Error: ${event.message}`;
  }
});
