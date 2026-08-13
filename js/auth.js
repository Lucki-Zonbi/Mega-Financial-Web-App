const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");
const authMessage = document.getElementById("authMessage");

const loginPassword =
  document.getElementById("password");

const toggleLoginPassword =
  document.getElementById(
    "toggleLoginPassword"
  );

if (
  loginPassword &&
  toggleLoginPassword
) {
  toggleLoginPassword.addEventListener(
    "click",
    function () {
      const passwordIsVisible =
        loginPassword.type === "text";

      loginPassword.type =
        passwordIsVisible
          ? "password"
          : "text";

      toggleLoginPassword.textContent =
        passwordIsVisible
          ? "Show"
          : "Hide";

      toggleLoginPassword.setAttribute(
        "aria-label",
        passwordIsVisible
          ? "Show password"
          : "Hide password"
      );

      toggleLoginPassword.setAttribute(
        "aria-pressed",
        String(!passwordIsVisible)
      );
    }
  );
}

function showAuthMessage(message, type = "info") {
  if (!authMessage) return;

  authMessage.textContent = message;
  authMessage.className = `auth-message ${type}`;
}

function saveAuthSession(token, user) {
  localStorage.setItem("megaFinancialToken", token);
  localStorage.setItem("megaFinancialUser", JSON.stringify(user));
}

function clearAuthSession() {
  localStorage.removeItem("megaFinancialToken");
  localStorage.removeItem("megaFinancialUser");
}

function getAuthToken() {
  return localStorage.getItem("megaFinancialToken");
}

async function fetchCurrentClientProfile() {
  const token = getAuthToken();

  if (!token) {
    return null;
  }

  const response = await fetch("/api/client/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();

  if (!response.ok) {
    clearAuthSession();
    return null;
  }

  return data.user;
}

if (registerForm) {
  registerForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const formData = new FormData(registerForm);

    const registrationData = {
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword")
    };

    try {
      showAuthMessage("Creating account...", "info");

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(registrationData)
      });

      const data = await response.json();

      if (!response.ok) {
        showAuthMessage(data.message || "Registration failed.", "error");
        return;
      }

      showAuthMessage(
        data.message || "Client account created successfully. You may now log in.",
        "success"
      );

      registerForm.reset();
    } catch (error) {
        showAuthMessage(
        "Unable to connect to the registration server. Please try again.",
        "error"
      );
    }
  });
}

if (loginForm) {
  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const formData = new FormData(loginForm);

    const loginData = {
      email: formData.get("email"),
      password: formData.get("password")
    };

    try {
      showAuthMessage("Logging in...", "info");

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(loginData)
      });

      const data = await response.json();

      if (!response.ok) {
        showAuthMessage(data.message || "Login failed.", "error");
        return;
      }

            saveAuthSession(data.token, data.user);

      const adminRoles = [
        "general_admin",
        "executive_admin"
      ];

      const destination = adminRoles.includes(data.user.role)
        ? "./admin-dashboard.html"
        : "./dashboard.html";

      const destinationLabel = adminRoles.includes(data.user.role)
        ? "admin dashboard"
        : "client dashboard";

      showAuthMessage(
        `Login successful. Redirecting to ${destinationLabel}...`,
        "success"
      );

      setTimeout(() => {
        window.location.href = destination;
      }, 900);
    } catch (error) {
      showAuthMessage(
        "Unable to connect to the login server. Please try again.",
        "error"
      );
    }
  });
}

window.megaFinancialAuth = {
  getAuthToken,
  clearAuthSession,
  fetchCurrentClientProfile
};
