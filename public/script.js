// Old demo script for chess passphrase auth (legacy, not used in main app)

async function registerUser() {
  const username = document.getElementById("reg-username").value;
  const passphrase = document.getElementById("reg-passphrase").value;
  const res = await fetch("/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, passphrase })
  });
  const data = await res.json();
  document.getElementById("reg-message").textContent = data.message || data.error;
}

async function loginUser() {
  const username = document.getElementById("login-username").value;
  const passphrase = document.getElementById("login-passphrase").value;
  const res = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, passphrase })
  });
  const data = await res.json();
  document.getElementById("login-message").textContent = data.message || data.error;
}

