const overlaySubtitle = document.getElementById("overlay-subtitle");
const gameTitle = document.getElementById("game-title");
const gameMeta = document.getElementById("game-meta");

const setOverlayStatus = (text) => {
  if (overlaySubtitle) {
    overlaySubtitle.textContent = text;
  }
};

const titleFromId = (value) =>
  value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const setTitle = (title) => {
  if (gameTitle) {
    gameTitle.textContent = title;
  }
  document.title = `${title} - Neo Games`;
};

const setMeta = (game) => {
  if (!gameMeta) {
    return;
  }
  const parts = [];
  if (game.genre) {
    parts.push(game.genre);
  }
  parts.push("Single Player", "Keyboard");
  gameMeta.textContent = parts.join(" / ");
};

const setNotFound = (message) => {
  setTitle("Game not found");
  if (gameMeta) {
    gameMeta.textContent = "This game is not available yet.";
  }
  setOverlayStatus(message);
};

const getGameId = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("id")?.trim() ?? "";
};

const loadGameMeta = async (gameId) => {
  if (window.NeoDB && window.NeoDB.enabled && window.NeoDB.fetchGame) {
    try {
      const game = await window.NeoDB.fetchGame(gameId);
      if (game) {
        setTitle(game.title || titleFromId(gameId));
        setMeta(game);
        if (overlaySubtitle && game.tagline) {
          overlaySubtitle.textContent = game.tagline;
        }
        window.NeoGameMeta = game;
        return;
      }
    } catch (error) {
      console.error(error);
    }
  }
  setTitle(titleFromId(gameId));
  setMeta({ genre: "Arcade" });
};

const loadGameScript = (gameId) => {
  if (!window.NeoSupabaseConfig?.url) {
    setOverlayStatus("Supabase not configured.");
    return;
  }
  const baseUrl = window.NeoSupabaseConfig.url.replace(/\/$/, "");
  const jsUrl = `${baseUrl}/storage/v1/object/public/games/${gameId}/game.js`;
  const script = document.createElement("script");
  script.src = jsUrl;
  script.onload = () => {
    setOverlayStatus("Game script ready.");
    const startBtn = document.getElementById("start-btn");
    const overlay = document.getElementById("start-overlay");
    const fallbackStart = () => {
      if (window.NeoStartGame) {
        window.NeoStartGame();
      } else {
        setOverlayStatus("Game not ready yet. Try again.");
      }
    };
    if (startBtn) {
      startBtn.addEventListener("click", fallbackStart);
    }
    if (overlay) {
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
          fallbackStart();
        }
      });
    }
  };
  script.onerror = () => setOverlayStatus("Game script failed to load.");
  document.body.appendChild(script);
};

const boot = async () => {
  const gameId = getGameId();
  if (!gameId) {
    setNotFound("Missing game id.");
    return;
  }
  setOverlayStatus("Loading game...");
  await loadGameMeta(gameId);
  loadGameScript(gameId);
};

boot();
