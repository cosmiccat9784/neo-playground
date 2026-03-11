const SITE_DATA_URL = "data/site.json";
const STORE_KEY = "neo-games-store-v1";

const defaultStore = {
  highScores: {},
  lastPlayed: {},
  progress: {},
};

const loadStore = () => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) {
      return { ...defaultStore };
    }
    return { ...defaultStore, ...JSON.parse(raw) };
  } catch (error) {
    return { ...defaultStore };
  }
};

const saveStore = (store) => {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
};

const updateHighScore = (gameId, score) => {
  const store = loadStore();
  const current = store.highScores[gameId] ?? 0;
  if (score > current) {
    store.highScores[gameId] = score;
    saveStore(store);
  }
  return store.highScores[gameId] ?? score;
};

const getHighScore = (gameId) => {
  const store = loadStore();
  return store.highScores[gameId] ?? 0;
};

const updateLastPlayed = (gameId) => {
  const store = loadStore();
  store.lastPlayed[gameId] = new Date().toISOString();
  saveStore(store);
};

const saveProgress = (gameId, progress) => {
  const store = loadStore();
  store.progress[gameId] = progress;
  saveStore(store);
};

const loadProgress = (gameId) => {
  const store = loadStore();
  return store.progress[gameId] ?? null;
};

const clearProgress = (gameId) => {
  const store = loadStore();
  delete store.progress[gameId];
  saveStore(store);
};

const loadSiteData = async () => {
  const response = await fetch(SITE_DATA_URL);
  if (!response.ok) {
    throw new Error("Unable to load site data");
  }
  return response.json();
};

window.NeoStore = {
  loadSiteData,
  updateHighScore,
  updateLastPlayed,
  getHighScore,
  saveProgress,
  loadProgress,
  clearProgress,
};
