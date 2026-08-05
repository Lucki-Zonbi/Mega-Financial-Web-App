const adminProtectedPages = [
  "admin-dashboard.html"
];

function getStoredAdminToken() {
  return localStorage.getItem("megaFinancialToken");
}

function clearAdminSession() {
  localStorage.removeItem("megaFinancialToken");
  localStorage.removeItem("megaFinancialUser");
}

function isAdminProtectedPage() {
  return adminProtectedPages.some((page) => {
    return window.location.pathname.endsWith(page);
  });
}

function redirectAdminToLogin() {
  window.location.href = "./login.html";
}

function redirectAdminToClientDashboard() {
  window.location.href = "./dashboard.html";
}

function formatAdminRole(role) {
  if (role === "executive_admin") {
    return "Executive Administrator";
  }

  if (role === "general_admin") {
    return "General Administrator";
  }

  return "Administrator";
}

function displayAdminIdentity(admin) {
  const nameTarget = document.getElementById(
    "adminDashboardName"
  );

  const profileNameTarget = document.getElementById(
    "adminProfileName"
  );

  const emailTarget = document.getElementById(
    "adminProfileEmail"
  );

  const roleTarget = document.getElementById(
    "adminProfileRole"
  );

  if (nameTarget) {
    nameTarget.textContent =
      admin.fullName || "Mega Financial administrator";
  }

  if (profileNameTarget) {
    profileNameTarget.textContent =
      admin.fullName || "Administrator";
  }

  if (emailTarget) {
    emailTarget.textContent =
      admin.email || "Administrator email unavailable";
  }

  if (roleTarget) {
    roleTarget.textContent = formatAdminRole(admin.role);
  }
}

function showAdminAccessMessage(message) {
  const messageTarget = document.getElementById(
    "adminAccessMessage"
  );

  if (!messageTarget) {
    return;
  }

  messageTarget.textContent = message;
}

function setupAdminLogoutButton() {
  const logoutButton = document.getElementById(
    "adminLogoutBtn"
  );

  if (!logoutButton) {
    return;
  }

  logoutButton.addEventListener("click", function () {
    clearAdminSession();
    redirectAdminToLogin();
  });
}

async function verifyAdminSession() {
  if (!isAdminProtectedPage()) {
    return;
  }

  const token = getStoredAdminToken();

  if (!token) {
    clearAdminSession();
    redirectAdminToLogin();
    return;
  }

  showAdminAccessMessage(
    "Confirming your protected administrator session..."
  );

  try {
    const response = await fetch("/api/admin/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      clearAdminSession();

      if (response.status === 403) {
        redirectAdminToClientDashboard();
        return;
      }

      redirectAdminToLogin();
      return;
    }

    displayAdminIdentity(data.admin);

    showAdminAccessMessage(
      "Administrator session confirmed. Client records are not exposed in this sprint."
    );
  } catch (error) {
    clearAdminSession();
    redirectAdminToLogin();
  }
}

setupAdminLogoutButton();
verifyAdminSession();

window.megaFinancialAdminGuard = {
  getStoredAdminToken,
  clearAdminSession,
  verifyAdminSession
};
