const normalizeRelativeLink = (link) => {
  if (!/^https?:\/\//i.test(link)) {
    return link;
  }
  if (link.includes(".supabase.co")) {
    return link;
  }
  try {
    const parsed = new URL(link);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch (error) {
    return link;
  }
};

const resolveLink = (game) => {
  if (game.link) {
    if (game.id && game.link.includes(".supabase.co/storage/")) {
      return `game.html?id=${game.id}`;
    }
    return normalizeRelativeLink(game.link);
  }
  return game.id ? `game.html?id=${game.id}` : "#";
};

const getThumbnailUrl = (game) => {
  const baseUrl = window.NeoSupabaseConfig?.url || "";
  if (!baseUrl || baseUrl.startsWith("YOUR_") || !game?.id) {
    return "";
  }
  const safeId = encodeURIComponent(game.id);
  return `${baseUrl.replace(/\\/$/, "")}/storage/v1/object/public/games/${safeId}/thumbnail.png`;
};

const buildCard = (game, options = {}) => {
  const ratingValue = Number(game.rating);
  const ratingBadge = Number.isFinite(ratingValue) ? ratingValue.toFixed(1) : "Unrated";
  const badgeText = options.badge ?? (game.new ? "New" : ratingBadge);
  const thumbUrl = getThumbnailUrl(game);
  const thumbStyle = thumbUrl
    ? ` style="background-image: url('${thumbUrl}'), var(--thumb-gradient)"`
    : "";

  return `
    <article class="card">
      <div class="thumb one"${thumbStyle}></div>
      <div class="card-meta">
        <h3>${game.title}</h3>
        <span class="badge">${badgeText}</span>
      </div>
      <p>${game.tagline}</p>
      <a class="card-link" href="${resolveLink(game)}">Play now</a>
    </article>
  `;
};

const isNewRelease = (game) => {
  const launchDate = game.launchDate ?? game.launch_date;
  if (!launchDate) {
    return false;
  }
  const launch = new Date(`${launchDate}T00:00:00`);
  if (Number.isNaN(launch.getTime())) {
    return false;
  }
  const now = new Date();
  const diffDays = (now - launch) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 30;
};

const renderTopRated = (games) => {
  const container = document.getElementById("top-rated-cards");
  if (!container) {
    return;
  }

  const sorted = [...games].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  container.innerHTML = sorted.map((game) => buildCard(game)).join("");

  const featured = sorted[0];
  if (featured) {
    const featuredTitle = document.getElementById("featured-title");
    const featuredLink = document.getElementById("featured-link");
    const launchStatus = document.getElementById("launch-status");
    const launchNote = document.getElementById("launch-note");

    if (featuredTitle) {
      featuredTitle.textContent = featured.title;
    }
    if (featuredLink) {
      featuredLink.textContent = `Play ${featured.title}`;
      featuredLink.setAttribute("href", resolveLink(featured));
    }
    if (launchStatus) {
      launchStatus.textContent = featured.launchStatus ?? featured.launch_status ?? "Live";
    }
    if (launchNote) {
      launchNote.textContent = featured.launchNote ?? featured.launch_note ?? `Now featuring ${featured.title}`;
    }
  }
};

const renderNew = (games) => {
  const container = document.getElementById("new-cards");
  if (!container) {
    return;
  }

  const newGames = games.filter(isNewRelease);
  if (!newGames.length) {
    container.innerHTML = `
      <div class="empty-state">
        <img class="empty-logo" src="assets/logo.png" alt="Neo Games logo" />
        <h2>No games here.</h2>
        <p>They’re on their way. Check back soon.</p>
      </div>
    `;
    return;
  }
  container.innerHTML = newGames.map((game) => buildCard(game, { badge: "New" })).join("");
};

const loadGames = async () => {
  if (window.NeoDB && window.NeoDB.enabled) {
    const games = await window.NeoDB.fetchGames();
    if (games.length) {
      return games;
    }
  }
  const data = await window.NeoStore.loadSiteData();
  return data.games ?? [];
};

const boot = async () => {
  try {
    const games = await loadGames();
    renderTopRated(games);
    renderNew(games);
  } catch (error) {
    console.error(error);
  }
};

boot();
