const form = document.getElementById("login-form");
const usernameInput = document.getElementById("login-username");
const passwordInput = document.getElementById("login-password");
const signupButton = document.getElementById("signup-button");
const statusEl = document.getElementById("login-status");

const setStatus = (text) => {
  statusEl.textContent = text;
};

const redirectHome = () => {
  window.location.href = "index.html";
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  if (!username || !password) {
    setStatus("Please enter a username and password.");
    return;
  }
  if (window.NeoAuth) {
    const result = window.NeoAuth.signInWithPassword
      ? await window.NeoAuth.signInWithPassword(username, password)
      : { ok: true, user: { username } };
    if (!result.ok) {
      setStatus(result.message || "Unable to sign in.");
      return;
    }
    window.NeoAuth.updateUI?.();
    setStatus(`Signed in as ${result.username || result.user?.username || username}.`);
    setTimeout(redirectHome, 400);
  }
});

signupButton?.addEventListener("click", async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  if (!window.NeoAuth?.signUp) {
    setStatus("Sign up is not available.");
    return;
  }
  const result = await window.NeoAuth.signUp(username, password);
  if (!result.ok) {
    setStatus(result.message || "Unable to create account.");
    return;
  }
  window.NeoAuth.updateUI?.();
  if (result.needsConfirmation) {
    setStatus("Account created. Confirm the email to sign in.");
    return;
  }
  setStatus(`Account created. Signed in as ${result.username || result.user?.username || username}.`);
  setTimeout(redirectHome, 400);
});

if (window.NeoAuth?.isSignedIn()) {
  const user = window.NeoAuth.getUser();
  setStatus(`Signed in as ${user?.username || ""}.`);
}
