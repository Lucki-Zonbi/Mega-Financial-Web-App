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

function redirectToAdminDashboard() {
  window.location.href = "./admin-dashboard.html";
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

  const adminRoles = [
    "general_admin",
    "executive_admin"
  ];

  if (user && adminRoles.includes(user.role)) {
    redirectToAdminDashboard();
  }
}

guardClientPreviewPage();
displayDashboardUser();
setupLogoutButton();

window.megaFinancialClientGuard = {
  getStoredUser,
  getStoredToken,
  clearClientSession
};
