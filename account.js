const accountTitle = document.getElementById("account-title");
const accountSubtitle = document.getElementById("account-subtitle");
const accountName = document.getElementById("account-name");
const accountStatus = document.getElementById("account-status");
const statScores = document.getElementById("stat-scores");
const statBest = document.getElementById("stat-best");
const statRatings = document.getElementById("stat-ratings");
const statLast = document.getElementById("stat-last");
const bestList = document.getElementById("account-best");
const ratingsList = document.getElementById("account-ratings");

const formatDate = (value) => {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

const renderEmpty = (el, message) => {
  if (!el) {
    return;
  }
  el.innerHTML = `<p class="muted">${message}</p>`;
};

const renderBestScores = (rows) => {
  if (!bestList) {
    return;
  }
  if (!rows.length) {
    renderEmpty(bestList, "No scores yet.");
    return;
  }
  const html = rows
    .map(
      (row) => `
        <div class="account-row">
          <div>
            <strong>${row.game}</strong>
            <span>${formatDate(row.lastPlayed)}</span>
          </div>
          <span class="mono">${row.score}</span>
        </div>
      `
    )
    .join("");
  bestList.innerHTML = html;
};

const renderRatings = (rows) => {
  if (!ratingsList) {
    return;
  }
  if (!rows.length) {
    renderEmpty(ratingsList, "No ratings yet.");
    return;
  }
  const html = rows
    .map(
      (row) => `
        <div class="account-row">
          <div>
            <strong>${row.game}</strong>
            <span>${formatDate(row.created_at)}</span>
          </div>
          <span class="mono">${row.rating.toFixed(1)}</span>
        </div>
      `
    )
    .join("");
  ratingsList.innerHTML = html;
};

const updateStats = (scores, ratings) => {
  const totalScores = scores.length;
  const totalRatings = ratings.length;
  const bestScore = scores.reduce((max, row) => Math.max(max, row.score), 0);
  const lastScore = scores[0]?.created_at ?? ratings[0]?.created_at ?? null;

  if (statScores) {
    statScores.textContent = totalScores.toString();
  }
  if (statBest) {
    statBest.textContent = bestScore.toString();
  }
  if (statRatings) {
    statRatings.textContent = totalRatings.toString();
  }
  if (statLast) {
    statLast.textContent = formatDate(lastScore);
  }
};

const buildBestByGame = (scores) => {
  const map = new Map();
  scores.forEach((row) => {
    const current = map.get(row.game_id);
    if (!current || row.score > current.score) {
      map.set(row.game_id, {
        game: row.game_id.replace(/-/g, " "),
        score: row.score,
        lastPlayed: row.created_at,
      });
    }
  });
  return Array.from(map.values()).sort((a, b) => b.score - a.score).slice(0, 10);
};

const boot = async () => {
  const username = window.NeoAuth?.getUser?.()?.username || "";
  if (accountName) {
    accountName.textContent = username || "Not signed in";
  }
  if (!username) {
    if (accountSubtitle) {
      accountSubtitle.textContent = "Sign in to see your scores and ratings.";
    }
    if (accountStatus) {
      accountStatus.textContent = "Log in to unlock leaderboards.";
    }
    renderEmpty(bestList, "Sign in to view your stats.");
    renderEmpty(ratingsList, "Sign in to view your stats.");
    updateStats([], []);
    return;
  }

  if (accountSubtitle) {
    accountSubtitle.textContent = "Here’s how you’ve been playing across Neo Games.";
  }
  if (accountStatus) {
    accountStatus.textContent = "Signed in and ready to play.";
  }

  if (!window.NeoDB || !window.NeoDB.enabled) {
    renderEmpty(bestList, "Supabase not configured yet.");
    renderEmpty(ratingsList, "Supabase not configured yet.");
    updateStats([], []);
    return;
  }

  try {
    const [scores, ratings] = await Promise.all([
      window.NeoDB.fetchUserScores?.(username) ?? [],
      window.NeoDB.fetchUserRatings?.(username) ?? [],
    ]);
    const best = buildBestByGame(scores);
    renderBestScores(best);
    renderRatings(ratings.slice(0, 10).map((row) => ({
      ...row,
      game: row.game_id.replace(/-/g, " "),
    })));
    updateStats(scores, ratings);
  } catch (error) {
    console.error(error);
    renderEmpty(bestList, "Unable to load scores.");
    renderEmpty(ratingsList, "Unable to load ratings.");
  }
};

boot();
