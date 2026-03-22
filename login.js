const form = document.getElementById("login-form");
const usernameInput = document.getElementById("login-username");
const passwordInput = document.getElementById("login-password");
const statusEl = document.getElementById("login-status");

const setStatus = (text) => {
  statusEl.textContent = text;
};

const redirectHome = () => {
  window.location.href = "index.html";
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  if (!username || !password) {
    setStatus("Please enter a username and password.");
    return;
  }
  if (window.NeoAuth) {
    window.NeoAuth.signIn(username);
    window.NeoAuth.updateUI?.();
    setStatus(`Signed in as ${username}.`);
    setTimeout(redirectHome, 400);
  }
});

if (window.NeoAuth?.isSignedIn()) {
  const user = window.NeoAuth.getUser();
  setStatus(`Signed in as ${user?.username || ""}.`);
}
