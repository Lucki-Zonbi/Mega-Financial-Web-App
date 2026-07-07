const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");
const authMessage = document.getElementById("authMessage");

function showAuthMessage(message, type = "info") {
  if (!authMessage) return;

  authMessage.textContent = message;
  authMessage.className = `auth-message ${type}`;
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
      showAuthMessage("Creating account preview...", "info");

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
        data.message || "Client account created successfully.",
        "success"
      );

      registerForm.reset();
    } catch (error) {
      showAuthMessage(
        "Unable to connect to the registration server. Make sure npm start is running.",
        "error"
      );
    }
  });
}

if (loginForm) {
  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    showAuthMessage(
      "Login is still a placeholder. JWT login will be added in a future sprint.",
      "success"
    );
  });
}
