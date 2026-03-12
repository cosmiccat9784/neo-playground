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
  const controls = game.controls || "Keyboard";
  parts.push("Single Player", controls);
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

const injectInlineScript = (code, sourceUrl) =>
  new Promise((resolve, reject) => {
    try {
      const script = document.createElement("script");
      script.text = `(function(){\ntry {\n${code}\n} catch (error) {\n  window.__neoBootError = error;\n  console.error(error);\n}\n})();\n//# sourceURL=${sourceUrl}`;
      document.body.appendChild(script);
      resolve(true);
    } catch (error) {
      reject(error);
    }
  });

const loadGameScript = async (gameId) => {
  if (!window.NeoSupabaseConfig?.url) {
    setOverlayStatus("Supabase not configured.");
    return;
  }
  const baseUrl = window.NeoSupabaseConfig.url.replace(/\/$/, "");
  const cacheBust = Date.now();
  const jsUrl = `${baseUrl}/storage/v1/object/public/games/${gameId}/game.js?v=${cacheBust}`;
  let scriptText = "";
  window.__neoBootError = null;
  try {
    const response = await fetch(jsUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Script fetch failed");
    }
    scriptText = await response.text();
    const trimmed = scriptText.trim();
    if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
      setOverlayStatus("Game file is HTML, not JS. Re-publish with the JS file.");
      return;
    }
    await injectInlineScript(scriptText, jsUrl);
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
          injectInlineScript(scriptText, jsUrl)
            .then(() => {
              if (window.NeoStartGame) {
                window.NeoStartGame();
              } else {
                const hasStart = scriptText.includes("NeoStartGame");
                setOverlayStatus(
                  hasStart
                    ? "Game failed to initialize."
                    : "Game script missing NeoStartGame. Re-publish the correct JS file."
                );
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

  setTimeout(() => {
    if (window.__neoBootError) {
      const message = window.__neoBootError.message || "Unknown error";
      setOverlayStatus(`Game error: ${message}`);
    }
  }, 50);
};

const boot = async () => {
  const gameId = getGameId();
  if (!gameId) {
    setNotFound("Missing game id.");
    return;
  }
  window.NeoGameId = gameId;
  setOverlayStatus("Loading game...");
  await loadGameMeta(gameId);
  await loadGameScript(gameId);
};

boot();
