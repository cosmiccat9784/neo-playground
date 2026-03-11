const loginForm = document.getElementById("dev-login");
const statusEl = document.getElementById("dev-status");
const uploaderSection = document.getElementById("dev-uploader");
const gameForm = document.getElementById("dev-game-form");

const devClient =
  window.supabase && window.NeoSupabaseConfig
    ? window.supabase.createClient(window.NeoSupabaseConfig.url, window.NeoSupabaseConfig.anonKey)
    : null;

const setStatus = (text) => {
  statusEl.textContent = text;
};

const requireAuth = () => {
  if (!window.NeoDB || !window.NeoDB.enabled) {
    setStatus("Supabase not configured.");
    return false;
  }
  if (!window.supabase) {
    setStatus("Supabase client not available.");
    return false;
  }
  return true;
};

const ensureUploaderHidden = () => {
  uploaderSection.style.display = "none";
};

const showUploader = () => {
  uploaderSection.style.display = "block";
};

ensureUploaderHidden();

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!requireAuth()) {
    return;
  }
  const email = document.getElementById("dev-email").value.trim();
  const password = document.getElementById("dev-password").value.trim();
  if (!devClient) {
    setStatus("Supabase client not available.");
    return;
  }
  const { error } = await devClient.auth.signInWithPassword({ email, password });
  if (error) {
    setStatus("Login failed.");
    return;
  }
  setStatus("Logged in.");
  showUploader();
});

gameForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!requireAuth()) {
    return;
  }
  const id = document.getElementById("game-id").value.trim();
  const title = document.getElementById("game-title").value.trim();
  const tagline = document.getElementById("game-tagline").value.trim();
  const genre = document.getElementById("game-genre").value.trim();
  const launchDate = document.getElementById("game-launch").value;
  const launchStatus = document.getElementById("game-status").value.trim() || "Live";
  const launchNote = document.getElementById("game-note").value.trim() || `Now featuring ${title}`;
  const ratingRaw = document.getElementById("game-rating").value;
  const rating = ratingRaw ? Number(ratingRaw) : null;
  const fileInput = document.getElementById("game-file");

  if (!fileInput.files || !fileInput.files.length) {
    setStatus("Please upload a JS game file.");
    return;
  }

  if (!devClient) {
    setStatus("Supabase client not available.");
    return;
  }

  const sessionResult = await devClient.auth.getSession();
  const token = sessionResult.data.session?.access_token;
  if (!token) {
    setStatus("Please log in again.");
    return;
  }

  const formData = new FormData();
  formData.append("id", id);
  formData.append("title", title);
  formData.append("tagline", tagline);
  formData.append("genre", genre);
  formData.append("launchDate", launchDate);
  formData.append("launchStatus", launchStatus);
  formData.append("launchNote", launchNote);
  if (rating !== null) {
    formData.append("rating", rating.toString());
  }
  formData.append("file", fileInput.files[0]);

  const response = await fetch(`${window.NeoSupabaseConfig.url}/functions/v1/create-game`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: window.NeoSupabaseConfig.anonKey,
    },
    body: formData,
  });

  if (!response.ok) {
    setStatus("Publish failed.");
    return;
  }

  setStatus("Game published.");
});
