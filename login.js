const form = document.getElementById("login-form");
const usernameInput = document.getElementById("login-username");
const emailInput = document.getElementById("login-email");
const passwordInput = document.getElementById("login-password");
const signupButton = document.getElementById("signup-button");
const resendButton = document.getElementById("resend-button");
const statusEl = document.getElementById("login-status");

const setStatus = (text) => {
  statusEl.textContent = text;
};

const redirectHome = () => {
  window.location.href = "index.html";
};

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

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = usernameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (!email || !password) {
    setStatus("Please enter your email and password.");
    return;
  }
  if (window.NeoAuth) {
    const result = window.NeoAuth.signInWithPassword
      ? await window.NeoAuth.signInWithPassword(email, password)
      : { ok: true, user: { username } };
    if (!result.ok) {
      setStatus(result.message || "Unable to sign in.");
      return;
    }
    window.NeoAuth.updateUI?.();
    const displayName = result.username || result.user?.user_metadata?.username || username || "your account";
    setStatus(`Signed in as ${displayName}.`);
    setTimeout(redirectHome, 400);
  }
});

signupButton?.addEventListener("click", async () => {
  const username = usernameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (!window.NeoAuth?.signUp) {
    setStatus("Sign up is not available.");
    return;
  }
  const result = await window.NeoAuth.signUp(username, email, password);
  if (!result.ok) {
    setStatus(result.message || "Unable to create account.");
    return;
  }
  window.NeoAuth.updateUI?.();
  if (result.needsConfirmation) {
    setStatus("Account created. Check your email to confirm and then sign in.");
    return;
  }
  const displayName = result.username || result.user?.user_metadata?.username || username || "your account";
  setStatus(`Account created. Signed in as ${displayName}.`);
  setTimeout(redirectHome, 400);
});

resendButton?.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  if (!email) {
    setStatus("Enter your email to resend confirmation.");
    return;
  }
  const client = getAuthClient();
  if (!client) {
    setStatus("Supabase auth is not configured yet.");
    return;
  }
  const { error } = await client.auth.resend({ type: "signup", email });
  if (error) {
    setStatus(error.message || "Unable to resend confirmation.");
    return;
  }
  setStatus("Confirmation email sent (if the address exists).");
});

if (window.NeoAuth?.isSignedIn()) {
  const user = window.NeoAuth.getUser();
  setStatus(`Signed in as ${user?.username || ""}.`);
}
