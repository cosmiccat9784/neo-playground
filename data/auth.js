const ACCOUNT_KEY = "neo-account-v1";

const getSupabaseUrl = () => window.NeoSupabaseConfig?.url ?? "";

const getProjectRef = () => {
  try {
    const url = new URL(getSupabaseUrl());
    return url.hostname.split(".")[0];
  } catch (error) {
    return "";
  }
};

const getAuthStoragePrefix = () => {
  const ref = getProjectRef();
  return ref ? `sb-${ref}-` : "";
};

const loadAccount = () => {
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
};

const saveAccount = (username) => {
  const payload = { username, signedInAt: new Date().toISOString() };
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(payload));
  return payload;
};

const clearAccount = () => {
  localStorage.removeItem(ACCOUNT_KEY);
};

const clearSupabaseSession = () => {
  const prefix = getAuthStoragePrefix();
  if (!prefix) {
    return;
  }
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith(prefix)) {
      localStorage.removeItem(key);
    }
  });
};

const getCachedUsername = () => loadAccount()?.username ?? "";

const usernameFromUser = (user) => {
  const meta = user?.user_metadata || {};
  if (meta.username) {
    return meta.username;
  }
  if (meta.display_name) {
    return meta.display_name;
  }
  const email = user?.email ?? "";
  return email ? email.split("@")[0] : "";
};

const getSessionUser = () => {
  const prefix = getAuthStoragePrefix();
  if (!prefix) {
    return null;
  }
  const authKey = `${prefix}auth-token`;
  try {
    const raw = localStorage.getItem(authKey);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (parsed?.user) {
      return parsed.user;
    }
    return parsed?.currentSession?.user ?? null;
  } catch (error) {
    return null;
  }
};

const syncCachedAccount = () => {
  if (!getAuthStoragePrefix()) {
    return getCachedUsername();
  }
  const user = getSessionUser();
  const username = user ? usernameFromUser(user) : "";
  if (username) {
    saveAccount(username);
  } else {
    clearAccount();
  }
  return username;
};

const getUser = () => {
  const sessionUser = getSessionUser();
  if (sessionUser) {
    return { username: usernameFromUser(sessionUser), user: sessionUser };
  }
  const cached = getCachedUsername();
  return cached ? { username: cached } : null;
};

const isSignedIn = () => Boolean(getUser()?.username);

const getAuthClient = () => {
  if (window.NeoSupabaseClient) {
    return window.NeoSupabaseClient;
  }
  if (!window.supabase || !window.NeoSupabaseConfig?.url || !window.NeoSupabaseConfig?.anonKey) {
    return null;
  }
  const client = window.supabase.createClient(
    window.NeoSupabaseConfig.url,
    window.NeoSupabaseConfig.anonKey
  );
  window.NeoSupabaseClient = client;
  return client;
};

const signInWithPassword = async (email, password) => {
  const trimmedEmail = email.trim();
  const trimmedPass = password.trim();
  if (!trimmedEmail || !trimmedPass) {
    return { ok: false, message: "Please enter your email and password." };
  }
  const client = getAuthClient();
  if (!client) {
    return { ok: false, message: "Supabase auth is not configured yet." };
  }
  const { data, error } = await client.auth.signInWithPassword({
    email: trimmedEmail,
    password: trimmedPass,
  });
  if (error) {
    return { ok: false, message: error.message };
  }
  const usernameValue = usernameFromUser(data.user) || trimmedEmail.split("@")[0];
  saveAccount(usernameValue);
  return { ok: true, user: data.user, username: usernameValue };
};

const signUp = async (username, email, password) => {
  const trimmedName = username.trim();
  const trimmedEmail = email.trim();
  const trimmedPass = password.trim();
  if (!trimmedName || !trimmedEmail || !trimmedPass) {
    return { ok: false, message: "Please enter a username, email, and password." };
  }
  if (trimmedPass.length < 4) {
    return { ok: false, message: "Password must be at least 4 characters." };
  }
  const client = getAuthClient();
  if (!client) {
    return { ok: false, message: "Supabase auth is not configured yet." };
  }
  const { data, error } = await client.auth.signUp({
    email: trimmedEmail,
    password: trimmedPass,
    options: {
      data: {
        username: trimmedName,
      },
    },
  });
  if (error) {
    return { ok: false, message: error.message };
  }
  const usernameValue = usernameFromUser(data.user) || trimmedName;
  if (data.session) {
    saveAccount(usernameValue);
  }
  return {
    ok: true,
    user: data.user,
    username: usernameValue,
    needsConfirmation: !data.session,
  };
};

const updateAccountUI = () => {
  const nameEl = document.querySelector("[data-neo-account-name]");
  const actionEl = document.querySelector("[data-neo-account-action]");
  const avatarEls = document.querySelectorAll("[data-neo-account-avatar]");
  const cachedUsername = syncCachedAccount() || getCachedUsername();
  const sessionUser = getSessionUser();
  const avatarUrl = sessionUser?.user_metadata?.avatar_url || "";

  if (nameEl) {
    nameEl.textContent = cachedUsername || "Not signed in";
  }

  if (avatarEls.length) {
    avatarEls.forEach((el) => {
      if (avatarUrl) {
        el.setAttribute("src", avatarUrl);
      }
    });
  }

  if (actionEl) {
    const loginHref = actionEl.dataset.neoLoginHref || "login.html";
    if (cachedUsername) {
      const accountHref = loginHref.replace(/login\.html.*$/i, "account.html");
      actionEl.textContent = "Account";
      actionEl.setAttribute("href", accountHref);
      actionEl.onclick = null;
    } else {
      actionEl.textContent = "Log in";
      actionEl.setAttribute("href", loginHref);
      actionEl.onclick = null;
    }
  }
};

window.NeoAuth = {
  getUser,
  isSignedIn,
  signIn: (username) => saveAccount(username),
  signInWithPassword,
  signUp,
  signOut: () => {
    clearAccount();
    clearSupabaseSession();
  },
  updateUI: updateAccountUI,
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", updateAccountUI, { once: true });
} else {
  updateAccountUI();
}
