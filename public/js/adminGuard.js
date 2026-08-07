const adminProtectedPages = [
  "admin-dashboard.html"
];

const adminDirectoryState = {
  page: 1,
  limit: 10,
  search: "",
  pagination: null,
  selectedClientId: null
};

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

function getAdminElement(elementId) {
  return document.getElementById(elementId);
}

function setAdminText(elementId, value) {
  const target = getAdminElement(elementId);

  if (target) {
    target.textContent = value;
  }
}

function clearAdminChildren(element) {
  if (!element) {
    return;
  }

  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function formatAdminBooleanStatus(value) {
  return value ? "Enabled" : "Not enabled";
}

function formatAdminVerificationStatus(value) {
  return value ? "Verified" : "Not verified";
}

function formatAdminDate(value) {
  if (!value) {
    return "Not available";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Not available";
  }

  return parsedDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function formatAdminStatus(value) {
  if (!value || typeof value !== "string") {
    return "Not available";
  }

  return value
    .split("_")
    .map((part) => {
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function handleAdminAuthorizationFailure(status) {
  clearAdminSession();

  if (status === 403) {
    redirectAdminToClientDashboard();
    return;
  }

  redirectAdminToLogin();
}

async function fetchProtectedAdminJson(url) {
  const token = getStoredAdminToken();

  if (!token) {
    handleAdminAuthorizationFailure(401);
    throw new Error("Administrator authentication is required.");
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  let data;

  try {
    data = await response.json();
  } catch (error) {
    data = {
      success: false,
      message: "The server returned an unreadable response."
    };
  }

  if (response.status === 401 || response.status === 403) {
    handleAdminAuthorizationFailure(response.status);

    throw new Error(
      "Administrator authorization could not be confirmed."
    );
  }

  if (!response.ok) {
    throw new Error(
      data.message || "The protected request failed."
    );
  }

  return data;
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

function showAdminAccessMessage(message, state = "success") {
  const messageTarget = getAdminElement(
    "adminAccessMessage"
  );

  if (!messageTarget) {
    return;
  }

  messageTarget.textContent = message;
  messageTarget.classList.remove("success", "error");
  messageTarget.classList.add(state);
}

function showAdminDirectoryMessage(message, state = "") {
  const messageTarget = getAdminElement(
    "adminDirectoryMessage"
  );

  if (!messageTarget) {
    return;
  }

  messageTarget.textContent = message;
  messageTarget.classList.remove("success", "error");

  if (state) {
    messageTarget.classList.add(state);
  }
}

function showAdminSummaryMessage(message, state = "") {
  const messageTarget = getAdminElement(
    "adminClientSummaryMessage"
  );

  if (!messageTarget) {
    return;
  }

  messageTarget.textContent = message;
  messageTarget.classList.remove("success", "error");

  if (state) {
    messageTarget.classList.add(state);
  }
}

function createAdminDetailLine(label, value) {
  const detailLine = document.createElement("p");
  const labelElement = document.createElement("strong");
  const valueElement = document.createElement("span");

  labelElement.textContent = `${label}: `;
  valueElement.textContent = value;

  detailLine.appendChild(labelElement);
  detailLine.appendChild(valueElement);

  return detailLine;
}

function createAdminClientCard(client) {
  const card = document.createElement("article");
  const heading = document.createElement("h4");
  const email = document.createElement("p");
  const statusGroup = document.createElement("div");
  const verificationStatus = document.createElement("span");
  const twoFactorStatus = document.createElement("span");
  const createdDate = document.createElement("p");
  const selectButton = document.createElement("button");

  card.className = "admin-client-card";

  if (client.id === adminDirectoryState.selectedClientId) {
    card.classList.add("selected");
  }

  heading.textContent = client.fullName || "Unnamed client";
  email.textContent = client.email || "Email unavailable";

  statusGroup.className = "admin-client-status-group";

  verificationStatus.className = "admin-status-pill";
  verificationStatus.textContent = client.isEmailVerified
    ? "Email verified"
    : "Email not verified";

  twoFactorStatus.className = "admin-status-pill";
  twoFactorStatus.textContent = client.twoFactorEnabled
    ? "2FA enabled"
    : "2FA not enabled";

  statusGroup.appendChild(verificationStatus);
  statusGroup.appendChild(twoFactorStatus);

  createdDate.className = "admin-client-created";
  createdDate.textContent =
    `Account created: ${formatAdminDate(client.createdAt)}`;

  selectButton.type = "button";
  selectButton.className = "btn primary-btn admin-client-view-btn";
  selectButton.textContent = "View Read-Only Summary";

  selectButton.addEventListener("click", function () {
    loadAdminClientSummary(client.id);
  });

  card.appendChild(heading);
  card.appendChild(email);
  card.appendChild(statusGroup);
  card.appendChild(createdDate);
  card.appendChild(selectButton);

  return card;
}

function renderAdminClientDirectory(clients) {
  const directoryTarget = getAdminElement(
    "adminClientDirectory"
  );

  clearAdminChildren(directoryTarget);

  if (!directoryTarget) {
    return;
  }

  if (!Array.isArray(clients) || clients.length === 0) {
    showAdminDirectoryMessage(
      adminDirectoryState.search
        ? "No clients matched the current search."
        : "No client accounts are currently available."
    );

    return;
  }

  clients.forEach((client) => {
    directoryTarget.appendChild(
      createAdminClientCard(client)
    );
  });

  showAdminDirectoryMessage(
    `${clients.length} client account${
      clients.length === 1 ? "" : "s"
    } displayed.`,
    "success"
  );
}

function updateAdminPagination(pagination) {
  const previousButton = getAdminElement(
    "adminPreviousPage"
  );

  const nextButton = getAdminElement(
    "adminNextPage"
  );

  const paginationStatus = getAdminElement(
    "adminPaginationStatus"
  );

  adminDirectoryState.pagination = pagination || null;

  if (!pagination) {
    if (previousButton) {
      previousButton.disabled = true;
    }

    if (nextButton) {
      nextButton.disabled = true;
    }

    if (paginationStatus) {
      paginationStatus.textContent = "Page 0 of 0";
    }

    return;
  }

  if (previousButton) {
    previousButton.disabled =
      !pagination.hasPreviousPage;
  }

  if (nextButton) {
    nextButton.disabled = !pagination.hasNextPage;
  }

  if (paginationStatus) {
    paginationStatus.textContent =
      `Page ${pagination.page} of ${pagination.totalPages}`;
  }
}

async function loadAdminClientDirectory(page = 1) {
  adminDirectoryState.page = page;

  showAdminDirectoryMessage(
    "Loading the protected client directory..."
  );

  updateAdminPagination(null);

  const query = new URLSearchParams({
    page: String(adminDirectoryState.page),
    limit: String(adminDirectoryState.limit)
  });

  if (adminDirectoryState.search) {
    query.set("search", adminDirectoryState.search);
  }

  try {
    const data = await fetchProtectedAdminJson(
      `/api/admin/clients?${query.toString()}`
    );

    adminDirectoryState.page =
      data.pagination?.page || 1;

    renderAdminClientDirectory(data.clients);
    updateAdminPagination(data.pagination);
  } catch (error) {
    const directoryTarget = getAdminElement(
      "adminClientDirectory"
    );

    clearAdminChildren(directoryTarget);
    updateAdminPagination(null);

    showAdminDirectoryMessage(
      error.message ||
        "The client directory could not be loaded.",
      "error"
    );
  }
}

function renderAdminIntakeSummary(intakeSummary) {
  const target = getAdminElement("adminIntakeSummary");

  clearAdminChildren(target);

  if (!target) {
    return;
  }

  if (
    !Array.isArray(intakeSummary) ||
    intakeSummary.length === 0
  ) {
    const emptyMessage = document.createElement("p");

    emptyMessage.className = "admin-summary-empty";
    emptyMessage.textContent =
      "No tax-intake status record is available.";

    target.appendChild(emptyMessage);
    return;
  }

  intakeSummary.forEach((intake) => {
    const card = document.createElement("article");
    const heading = document.createElement("h5");

    card.className = "admin-summary-status-card";
    heading.textContent = `Tax Year ${intake.taxYear}`;

    card.appendChild(heading);

    card.appendChild(
      createAdminDetailLine(
        "Status",
        formatAdminStatus(intake.status)
      )
    );

    card.appendChild(
      createAdminDetailLine(
        "Submitted",
        formatAdminDate(intake.submittedAt)
      )
    );

    card.appendChild(
      createAdminDetailLine(
        "Last updated",
        formatAdminDate(intake.updatedAt)
      )
    );

    target.appendChild(card);
  });
}

function renderAdminDocumentSummary(documentSummary) {
  const target = getAdminElement(
    "adminDocumentSummary"
  );

  clearAdminChildren(target);

  if (!target) {
    return;
  }

  const availableSummaries = Array.isArray(documentSummary)
    ? documentSummary.filter((summary) => {
        return summary.totalMetadataRecords > 0;
      })
    : [];

  if (availableSummaries.length === 0) {
    const emptyMessage = document.createElement("p");

    emptyMessage.className = "admin-summary-empty";
    emptyMessage.textContent =
      "No document metadata status is available.";

    target.appendChild(emptyMessage);
    return;
  }

  availableSummaries.forEach((summary) => {
    const card = document.createElement("article");
    const heading = document.createElement("h5");
    const total = document.createElement("p");
    const statusList = document.createElement("ul");

    card.className = "admin-summary-status-card";
    heading.textContent = `Tax Year ${summary.taxYear}`;

    total.textContent =
      `Total metadata records: ${
        summary.totalMetadataRecords
      }`;

    statusList.className = "admin-document-status-list";

    const statuses = Array.isArray(summary.statuses)
      ? summary.statuses
      : [];

    statuses.forEach((status) => {
      const item = document.createElement("li");

      item.textContent =
        `${formatAdminStatus(status.uploadStatus)} / ` +
        `${formatAdminStatus(status.reviewStatus)}: ` +
        `${status.count}`;

      statusList.appendChild(item);
    });

    card.appendChild(heading);
    card.appendChild(total);
    card.appendChild(statusList);
    target.appendChild(card);
  });
}

function displayAdminClientSummary(data) {
  const summaryContent = getAdminElement(
    "adminClientSummaryContent"
  );

  const client = data.client || {};

  setAdminText(
    "adminSummaryClientName",
    client.fullName || "Name unavailable"
  );

  setAdminText(
    "adminSummaryClientEmail",
    client.email || "Email unavailable"
  );

  setAdminText(
    "adminSummaryEmailVerified",
    formatAdminVerificationStatus(
      client.isEmailVerified
    )
  );

  setAdminText(
    "adminSummaryTwoFactor",
    formatAdminBooleanStatus(
      client.twoFactorEnabled
    )
  );

  setAdminText(
    "adminSummaryCreatedAt",
    formatAdminDate(client.createdAt)
  );

  setAdminText(
    "adminSummaryUpdatedAt",
    formatAdminDate(client.updatedAt)
  );

  renderAdminIntakeSummary(data.intakeSummary);
  renderAdminDocumentSummary(data.documentSummary);

  if (summaryContent) {
    summaryContent.hidden = false;
  }

  showAdminSummaryMessage(
    "Authorized read-only client summary loaded.",
    "success"
  );
}

async function loadAdminClientSummary(clientId) {
  if (!clientId) {
    return;
  }

  adminDirectoryState.selectedClientId = clientId;

  showAdminSummaryMessage(
    "Loading the selected client summary..."
  );

  try {
    const data = await fetchProtectedAdminJson(
      `/api/admin/clients/${
        encodeURIComponent(clientId)
      }/summary`
    );

    displayAdminClientSummary(data);

    await loadAdminClientDirectory(
      adminDirectoryState.page
    );
  } catch (error) {
    const summaryContent = getAdminElement(
      "adminClientSummaryContent"
    );

    if (summaryContent) {
      summaryContent.hidden = true;
    }

    showAdminSummaryMessage(
      error.message ||
        "The client summary could not be loaded.",
      "error"
    );
  }
}

function setupAdminDirectoryControls() {
  const searchForm = getAdminElement(
    "adminClientSearchForm"
  );

  const searchInput = getAdminElement(
    "adminClientSearch"
  );

  const clearButton = getAdminElement(
    "adminClientSearchClear"
  );

  const previousButton = getAdminElement(
    "adminPreviousPage"
  );

  const nextButton = getAdminElement(
    "adminNextPage"
  );

  if (searchForm && searchInput) {
    searchForm.addEventListener("submit", function (event) {
      event.preventDefault();

      adminDirectoryState.search =
        searchInput.value.trim().slice(0, 100);

      adminDirectoryState.selectedClientId = null;

      loadAdminClientDirectory(1);
    });
  }

  if (clearButton && searchInput) {
    clearButton.addEventListener("click", function () {
      searchInput.value = "";
      adminDirectoryState.search = "";
      adminDirectoryState.selectedClientId = null;

      loadAdminClientDirectory(1);
    });
  }

  if (previousButton) {
    previousButton.addEventListener("click", function () {
      const pagination = adminDirectoryState.pagination;

      if (!pagination?.hasPreviousPage) {
        return;
      }

      loadAdminClientDirectory(
        Math.max(1, pagination.page - 1)
      );
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", function () {
      const pagination = adminDirectoryState.pagination;

      if (!pagination?.hasNextPage) {
        return;
      }

      loadAdminClientDirectory(
        pagination.page + 1
      );
    });
  }
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
      "Administrator session confirmed. Read-only client directory access is active.",
      "success"
    );

    await loadAdminClientDirectory(1);
  } catch (error) {
    clearAdminSession();
    redirectAdminToLogin();
  }
}

setupAdminLogoutButton();
setupAdminDirectoryControls();
verifyAdminSession();

window.megaFinancialAdminGuard = {
  getStoredAdminToken,
  clearAdminSession,
  verifyAdminSession,
  loadAdminClientDirectory,
  loadAdminClientSummary
};
