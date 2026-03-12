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

const injectScript = (src) =>
  new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Script failed to load"));
    document.body.appendChild(script);
  });

const fetchAndInjectScript = async (src) => {
  const response = await fetch(src, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Script fetch failed");
  }
  const text = await response.text();
  const blob = new Blob([text], { type: "application/javascript" });
  const blobUrl = URL.createObjectURL(blob);
  await injectScript(blobUrl);
  URL.revokeObjectURL(blobUrl);
};

const loadGameScript = async (gameId) => {
  if (!window.NeoSupabaseConfig?.url) {
    setOverlayStatus("Supabase not configured.");
    return;
  }
  const baseUrl = window.NeoSupabaseConfig.url.replace(/\/$/, "");
  const cacheBust = Date.now();
  const jsUrl = `${baseUrl}/storage/v1/object/public/games/${gameId}/game.js?v=${cacheBust}`;
  try {
    await injectScript(jsUrl);
  } catch (error) {
    setOverlayStatus("Game script failed to load.");
    return;
  }

  const startBtn = document.getElementById("start-btn");
  const overlay = document.getElementById("start-overlay");
  const fallbackStart = () => {
    if (window.NeoStartGame) {
      window.NeoStartGame();
    } else {
      setOverlayStatus("Game not ready yet. Retrying...");
      setTimeout(() => {
        if (window.NeoStartGame) {
          window.NeoStartGame();
        } else {
          setOverlayStatus("Game still not ready. Rebuilding script...");
          fetchAndInjectScript(jsUrl)
            .then(() => {
              if (window.NeoStartGame) {
                window.NeoStartGame();
              } else {
                setOverlayStatus("Game failed to initialize.");
              }
            })
            .catch(() => setOverlayStatus("Game script failed to load."));
        }
      }, 150);
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

  if (window.NeoStartGame) {
    setOverlayStatus("Game script ready.");
  } else {
    setOverlayStatus("Game script loaded but did not initialize.");
  }
};

const boot = async () => {
  const gameId = getGameId();
  if (!gameId) {
    setNotFound("Missing game id.");
    return;
  }
  setOverlayStatus("Loading game...");
  await loadGameMeta(gameId);
  await loadGameScript(gameId);
};

boot();
