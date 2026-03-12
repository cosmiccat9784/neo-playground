const hasConfig = () => {
  return (
    window.NeoSupabaseConfig &&
    window.NeoSupabaseConfig.url &&
    window.NeoSupabaseConfig.anonKey &&
    !window.NeoSupabaseConfig.url.startsWith("YOUR_")
  );
};

const createClient = () => {
  if (!hasConfig() || !window.supabase) {
    return null;
  }
  return window.supabase.createClient(
    window.NeoSupabaseConfig.url,
    window.NeoSupabaseConfig.anonKey
  );
};

let client = null;

const getClient = () => {
  if (!client) {
    client = createClient();
  }
  window.NeoDB.enabled = Boolean(client);
  return client;
};

const fetchLeaderboard = async (gameId) => {
  const activeClient = getClient();
  if (!activeClient) {
    return [];
  }
  const { data, error } = await activeClient
    .from("scores")
    .select("username, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(10);

  if (error) {
    console.error(error);
    return [];
  }
  return data ?? [];
};

const submitScore = async (gameId, username, score) => {
  const activeClient = getClient();
  if (!activeClient) {
    return false;
  }
  const { error } = await activeClient.from("scores").insert({
    game_id: gameId,
    username,
    score,
  });
  if (error) {
    console.error(error);
    return false;
  }
  return true;
};

const fetchRatings = async (gameId) => {
  const activeClient = getClient();
  if (!activeClient) {
    return { average: null, count: 0 };
  }
  const { data, error } = await activeClient
    .from("ratings")
    .select("rating")
    .eq("game_id", gameId);
  if (error) {
    console.error(error);
    return { average: null, count: 0 };
  }
  if (!data || data.length === 0) {
    return { average: null, count: 0 };
  }
  const total = data.reduce((sum, row) => sum + row.rating, 0);
  return { average: total / data.length, count: data.length };
};

const submitRating = async (gameId, username, rating) => {
  const activeClient = getClient();
  if (!activeClient) {
    return false;
  }
  const { error } = await activeClient.from("ratings").insert({
    game_id: gameId,
    username,
    rating,
  });
  if (error) {
    console.error(error);
    return false;
  }
  return true;
};

const mapGameRow = (row) => ({
  id: row.id,
  title: row.title,
  tagline: row.tagline,
  rating: row.rating,
  launchDate: row.launch_date,
  launchStatus: row.launch_status,
  launchNote: row.launch_note,
  genre: row.genre,
  link: row.link,
});

const fetchGames = async () => {
  const activeClient = getClient();
  if (!activeClient) {
    return [];
  }
  const { data, error } = await activeClient
    .from("games")
    .select("id, title, tagline, rating, launch_date, launch_status, launch_note, genre, link")
    .order("launch_date", { ascending: false });
  if (error) {
    console.error(error);
    return [];
  }
  return (data ?? []).map(mapGameRow);
};

const fetchGame = async (gameId) => {
  const activeClient = getClient();
  if (!activeClient) {
    return null;
  }
  const { data, error } = await activeClient
    .from("games")
    .select("id, title, tagline, rating, launch_date, launch_status, launch_note, genre, link")
    .eq("id", gameId)
    .single();
  if (error) {
    console.error(error);
    return null;
  }
  return data ? mapGameRow(data) : null;
};

const uploadGameFile = async (slug, file) => {
  const activeClient = getClient();
  if (!activeClient) {
    return null;
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${slug}/${Date.now()}-${safeName}`;
  const { error } = await activeClient.storage.from("games").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) {
    console.error(error);
    return null;
  }
  const { data } = activeClient.storage.from("games").getPublicUrl(path);
  return data.publicUrl ?? null;
};

const insertGame = async (game) => {
  const activeClient = getClient();
  if (!activeClient) {
    return false;
  }
  const { error } = await activeClient.from("games").insert({
    id: game.id,
    title: game.title,
    tagline: game.tagline,
    genre: game.genre,
    rating: game.rating,
    launch_date: game.launchDate,
    launch_status: game.launchStatus,
    launch_note: game.launchNote,
    link: game.link,
  });
  if (error) {
    console.error(error);
    return false;
  }
  return true;
};

window.NeoDB = {
  enabled: false,
  fetchLeaderboard,
  submitScore,
  fetchRatings,
  submitRating,
  fetchGames,
  fetchGame,
  insertGame,
  uploadGameFile,
};

getClient();
