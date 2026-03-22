const ACCOUNT_KEY = "neo-account-v1";

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
  signOut: clearAccount,
  updateUI: updateAccountUI,
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", updateAccountUI, { once: true });
} else {
  updateAccountUI();
}
