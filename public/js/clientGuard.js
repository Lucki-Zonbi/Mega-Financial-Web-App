const protectedPreviewPages = [
  "dashboard.html",
  "schedule.html",
  "intake.html",
  "documents.html"
];

function getStoredUser() {
  const storedUser = localStorage.getItem("megaFinancialUser");

  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser);
  } catch (error) {
    localStorage.removeItem("megaFinancialUser");
    return null;
  }
}

function getStoredToken() {
  return localStorage.getItem("megaFinancialToken");
}

function clearClientSession() {
  localStorage.removeItem("megaFinancialToken");
  localStorage.removeItem("megaFinancialUser");
}

function isProtectedPreviewPage() {
  return protectedPreviewPages.some((page) => {
    return window.location.pathname.endsWith(page);
  });
}

function redirectToLogin() {
  window.location.href = "./login.html";
}

function isAdminPreviewMode() {
  const user = getStoredUser();

  if (!user) {
    return false;
  }

  const adminRoles = [
    "general_admin",
    "executive_admin"
  ];

  return adminRoles.includes(
    user.role
  );
}

function enableAdminPreviewMode() {
  if (!isAdminPreviewMode()) {
    return;
  }

  document.body.classList.add(
    "admin-preview-mode"
  );

  const existingBanner =
    document.getElementById(
      "adminPreviewBanner"
    );

  if (existingBanner) {
    return;
  }

  const banner =
    document.createElement("div");

  banner.id =
    "adminPreviewBanner";

  banner.className =
    "admin-preview-banner";

  const message =
    document.createElement("p");

  message.textContent =
    "Executive Admin Preview Mode — client-facing actions are disabled.";

  const returnLink =
    document.createElement("a");

  returnLink.href =
    "./admin-dashboard.html";

  returnLink.className =
    "btn secondary-btn";

  returnLink.textContent =
    "Return to Admin Dashboard";

  banner.appendChild(message);
  banner.appendChild(returnLink);

  document.body.prepend(banner);
}

function displayDashboardUser() {
  const user = getStoredUser();

  const nameTarget = document.getElementById("dashboardClientName");
  const emailTarget = document.getElementById("dashboardClientEmail");

  if (!user) return;

  if (nameTarget) {
    nameTarget.textContent = user.fullName || "Client Name Placeholder";
  }

  if (emailTarget) {
    emailTarget.textContent = user.email || "client@example.com";
  }
}

function setupLogoutButton() {
  const logoutBtn = document.getElementById("logoutBtn");

  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", function () {
    clearClientSession();
    window.location.href = "./login.html";
  });
}

function guardClientPreviewPage() {
  if (!isProtectedPreviewPage()) {
    return;
  }

  const token = getStoredToken();
  const user = getStoredUser();

  if (!token) {
    alert("Please log in to access this client page.");
    redirectToLogin();
    return;
  }

    if (user && isAdminPreviewMode()) {
    enableAdminPreviewMode();
  }
}

guardClientPreviewPage();
displayDashboardUser();
setupLogoutButton();

window.megaFinancialClientGuard = {
  getStoredUser,
  getStoredToken,
  clearClientSession,
  isAdminPreviewMode
};
