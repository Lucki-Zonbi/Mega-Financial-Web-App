const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");
const authMessage = document.getElementById("authMessage");

function showAuthMessage(message, type = "info") {
  if (!authMessage) return;

  authMessage.textContent = message;
  authMessage.className = `auth-message ${type}`;
}

if (registerForm) {
  registerForm.addEventListener("submit", function (event) {
    event.preventDefault();

    showAuthMessage(
      "Registration hook is connected. Real account creation will be added in a future sprint.",
      "success"
    );
  });
}

if (loginForm) {
  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    showAuthMessage(
      "Login hook is connected. Real authentication and dashboard redirect will be added in a future sprint.",
      "success"
    );
  });
}
