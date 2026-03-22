const ACCOUNT_KEY = "neo-account-v1";
const ACCOUNTS_KEY = "neo-accounts-v1";

const normalizeUsername = (username) => username.trim().toLowerCase();

const loadAccount = () => {
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
};

const loadAccounts = () => {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const saveAccounts = (accounts) => {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
};

const findAccount = (username) => {
  const key = normalizeUsername(username);
  return loadAccounts().find((account) => account.key === key);
};

const saveAccount = (username) => {
  const payload = { username, signedInAt: new Date().toISOString() };
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(payload));
  return payload;
};

const clearAccount = () => {
  localStorage.removeItem(ACCOUNT_KEY);
};

const signInWithPassword = (username, password) => {
  const trimmedName = username.trim();
  const trimmedPass = password.trim();
  if (!trimmedName || !trimmedPass) {
    return { ok: false, message: "Please enter a username and password." };
  }
  const account = findAccount(trimmedName);
  if (!account) {
    return { ok: false, message: "No account found. Create one first." };
  }
  if (account.password !== trimmedPass) {
    return { ok: false, message: "Incorrect password." };
  }
  saveAccount(account.username);
  return { ok: true, user: account };
};

const registerAccount = (username, password) => {
  const trimmedName = username.trim();
  const trimmedPass = password.trim();
  if (!trimmedName || !trimmedPass) {
    return { ok: false, message: "Please enter a username and password." };
  }
  if (trimmedPass.length < 4) {
    return { ok: false, message: "Password must be at least 4 characters." };
  }
  const accounts = loadAccounts();
  const key = normalizeUsername(trimmedName);
  if (accounts.some((account) => account.key === key)) {
    return { ok: false, message: "That username is already taken." };
  }
  const account = {
    username: trimmedName,
    key,
    password: trimmedPass,
    createdAt: new Date().toISOString(),
  };
  accounts.push(account);
  saveAccounts(accounts);
  saveAccount(trimmedName);
  return { ok: true, user: account };
};

const getUser = () => loadAccount();
const isSignedIn = () => Boolean(loadAccount()?.username);

const updateAccountUI = () => {
  const nameEl = document.querySelector("[data-neo-account-name]");
  const actionEl = document.querySelector("[data-neo-account-action]");
  const user = loadAccount();

  if (nameEl) {
    nameEl.textContent = user?.username || "Not signed in";
  }

  if (actionEl) {
    const loginHref = actionEl.dataset.neoLoginHref || "login.html";
    if (user?.username) {
      actionEl.textContent = "Log out";
      actionEl.setAttribute("href", "#");
      actionEl.onclick = (event) => {
        event.preventDefault();
        clearAccount();
        updateAccountUI();
      };
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
  signUp: registerAccount,
  signOut: clearAccount,
  updateUI: updateAccountUI,
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", updateAccountUI, { once: true });
} else {
  updateAccountUI();
}
