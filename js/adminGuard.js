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

const adminAuditState = {
  page: 1,
  limit: 10,
  pagination: null,
  accessEnabled: false
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

function formatAdminDateTime(value) {
  if (!value) {
    return "Not available";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Not available";
  }

  return parsedDate.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
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

function showAdminAuditMessage(
  message,
  type = ""
) {
  const target =
    getAdminElement(
      "adminAuditActivityMessage"
    );

  if (!target) {
    return;
  }

  target.textContent = message;

  target.className =
    "admin-directory-message";

  if (
    type === "success" ||
    type === "error"
  ) {
    target.classList.add(type);
  }
}

function updateAdminAuditPagination(
  pagination
) {
  const previousButton =
    getAdminElement(
      "adminAuditPreviousPage"
    );

  const nextButton =
    getAdminElement(
      "adminAuditNextPage"
    );

  const status =
    getAdminElement(
      "adminAuditPaginationStatus"
    );

  adminAuditState.pagination =
    pagination || null;

  if (!pagination) {
    if (previousButton) {
      previousButton.disabled = true;
    }

    if (nextButton) {
      nextButton.disabled = true;
    }

    if (status) {
      status.textContent =
        "Page 0 of 0";
    }

    return;
  }

  if (previousButton) {
    previousButton.disabled =
      !pagination.hasPreviousPage;
  }

  if (nextButton) {
    nextButton.disabled =
      !pagination.hasNextPage;
  }

  if (status) {
    status.textContent =
      `Page ${pagination.page} of ` +
      `${pagination.totalPages}`;
  }
}


function handleAdminAuthorizationFailure(status) {
  if (status === 401) {
    clearAdminSession();
    redirectAdminToLogin();
    return;
  }

  if (status === 403) {
    redirectAdminToClientDashboard();
    return;
  }

  clearAdminSession();
  redirectAdminToLogin();
}

async function sendProtectedAdminJson(
  url,
  method,
  body
) {
  const token = getStoredAdminToken();

  if (!token) {
    handleAdminAuthorizationFailure(401);

    throw new Error(
      "Administrator authentication is required."
    );
  }

    let response;

  try {
    response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
  } catch (error) {
    throw new Error(
      "The Mega Financial server could not be reached. " +
        "Your administrator session has been preserved."
    );
  }

  let data;

  try {
    data = await response.json();
  } catch (error) {
    data = {
      success: false,
      message:
        "The server returned an unreadable response."
    };
  }

  if (
    response.status === 401 ||
    response.status === 403
  ) {
    handleAdminAuthorizationFailure(
      response.status
    );

    throw new Error(
      "Administrator authorization could not be confirmed."
    );
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
        "The protected request failed."
    );
  }

  return data;
}

async function fetchProtectedAdminJson(url) {
  const token = getStoredAdminToken();

  if (!token) {
    handleAdminAuthorizationFailure(401);
    throw new Error("Administrator authentication is required.");
  }

    let response;

  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  } catch (error) {
    throw new Error(
      "The Mega Financial server could not be reached. " +
        "Your administrator session has been preserved."
    );
  }

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

function configureAdminAuditAccess(
  admin
) {
  const button =
    getAdminElement(
      "adminAuditActivityButton"
    );

  const section =
    getAdminElement(
      "adminAuditActivitySection"
    );

  const isExecutiveAdmin =
    admin?.role ===
    "executive_admin";

  adminAuditState.accessEnabled =
    isExecutiveAdmin;

  if (button) {
    button.disabled =
      !isExecutiveAdmin;

    button.classList.toggle(
      "active-action-card",
      isExecutiveAdmin
    );
  }

  if (
    section &&
    !isExecutiveAdmin
  ) {
    section.hidden = true;
  }
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

function renderAdminAuditActivity(
  activity
) {
  const list =
    getAdminElement(
      "adminAuditActivityList"
    );

  if (!list) {
    return;
  }

  clearAdminChildren(list);

  if (
    !Array.isArray(activity) ||
    activity.length === 0
  ) {
    const emptyMessage =
      document.createElement("p");

    emptyMessage.className =
      "admin-summary-empty";

    emptyMessage.textContent =
      "No administrator audit activity is available.";

    list.appendChild(emptyMessage);
    return;
  }

  activity.forEach((entry) => {
    const card =
      document.createElement("article");

    card.className =
      "admin-summary-status-card";

    const heading =
      document.createElement("h5");

    heading.textContent =
      formatAdminStatus(
        entry.action
      );

    const administrator =
      document.createElement("p");

    administrator.textContent =
      "Administrator: " +
      (
        entry.administrator?.fullName ||
        "Administrator"
      );

    const role =
      document.createElement("p");

    role.textContent =
      "Role: " +
      formatAdminRole(
        entry.administrator?.role
      );

    const client =
      document.createElement("p");

    client.textContent =
      "Client: " +
      (
        entry.client?.fullName ||
        "Client"
      );

    const resource =
      document.createElement("p");

    resource.textContent =
      "Resource: " +
      formatAdminStatus(
        entry.resourceType
      );

    const transition =
      document.createElement("p");

    transition.textContent =
      "Status: " +
      formatAdminStatus(
        entry.previousStatus
      ) +
      " → " +
      formatAdminStatus(
        entry.newStatus
      );

    const occurredAt =
      document.createElement("p");

    occurredAt.textContent =
      "Recorded: " +
      formatAdminDateTime(
        entry.createdAt
      );

    card.appendChild(heading);
    card.appendChild(administrator);
    card.appendChild(role);
    card.appendChild(client);
    card.appendChild(resource);
    card.appendChild(transition);
    card.appendChild(occurredAt);

    list.appendChild(card);
  });
}

async function loadAdminAuditActivity(
  page = 1
) {
  if (!adminAuditState.accessEnabled) {
    return;
  }

  adminAuditState.page =
    Math.max(1, page);

  showAdminAuditMessage(
    "Loading protected administrator audit activity..."
  );

  try {
    const data =
      await fetchProtectedAdminJson(
        `/api/admin/audit-activity?page=` +
        `${adminAuditState.page}&limit=` +
        `${adminAuditState.limit}`
      );

    renderAdminAuditActivity(
      data.activity
    );

    updateAdminAuditPagination(
      data.pagination
    );

    showAdminAuditMessage(
      data.message ||
        "Audit activity loaded.",
      "success"
    );
  } catch (error) {
    renderAdminAuditActivity([]);

    updateAdminAuditPagination(null);

    showAdminAuditMessage(
      error.message ||
        "Audit activity could not be loaded.",
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

function showAdminAppointmentMessage(
  message,
  state = ""
) {
  const target = getAdminElement(
    "adminAppointmentMessage"
  );

  if (!target) {
    return;
  }

  target.textContent = message;

  target.classList.remove(
    "success",
    "error"
  );

  if (state) {
    target.classList.add(state);
  }
}

function showAdminDocumentReviewMessage(
  message,
  state = ""
) {
  const target = getAdminElement(
    "adminDocumentReviewMessage"
  );

  if (!target) {
    return;
  }

  target.textContent = message;
  target.classList.remove(
    "success",
    "error"
  );

  if (state) {
    target.classList.add(state);
  }
}

function getAllowedAppointmentStatuses(
  currentStatus
) {
  const transitions = {
    requested: [
      "confirmed",
      "cancelled"
    ],

    confirmed: [
      "completed",
      "cancelled"
    ],

    completed: [],

    cancelled: []
  };

  return transitions[currentStatus] || [];
}

function getAllowedReviewStatuses(
  currentStatus
) {
  const transitions = {
    not_reviewed: [
      "under_review"
    ],

    under_review: [
      "accepted",
      "rejected"
    ],

    rejected: [
      "under_review"
    ],

    accepted: [
      "under_review"
    ]
  };

  return transitions[currentStatus] || [];
}

async function downloadAdminDocument(
  clientId,
  documentRecord
) {
  const token = getStoredAdminToken();

  if (!token) {
    handleAdminAuthorizationFailure(401);
    return;
  }

  try {
    const response = await fetch(
      `/api/admin/clients/${
        encodeURIComponent(clientId)
      }/documents/${
        encodeURIComponent(documentRecord.id)
      }/download`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      handleAdminAuthorizationFailure(
        response.status
      );

      return;
    }

    if (!response.ok) {
      throw new Error(
        "The document could not be retrieved."
      );
    }

    const blob = await response.blob();
    const objectUrl =
      URL.createObjectURL(blob);

    const temporaryLink =
      document.createElement("a");

    temporaryLink.href = objectUrl;
    temporaryLink.download =
      documentRecord.originalFileName ||
      "client-document";

    document.body.appendChild(
      temporaryLink
    );

    temporaryLink.click();
    temporaryLink.remove();

    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    showAdminDocumentReviewMessage(
      error.message ||
        "The document could not be retrieved.",
      "error"
    );
  }
}

async function updateAdminDocumentReviewStatus(
  clientId,
  documentId,
  reviewStatus
) {
  try {
    await sendProtectedAdminJson(
      `/api/admin/clients/${
        encodeURIComponent(clientId)
      }/documents/${
        encodeURIComponent(documentId)
      }/review-status`,
      "PATCH",
      {
        reviewStatus
      }
    );

    showAdminDocumentReviewMessage(
      "Document review status updated.",
      "success"
    );

    await loadAdminClientDocuments(
      clientId
    );

    await loadAdminClientSummary(
      clientId
    );
  } catch (error) {
    showAdminDocumentReviewMessage(
      error.message ||
        "The review status could not be updated.",
      "error"
    );
  }
}

function createAdminDocumentReviewCard(
  clientId,
  documentRecord
) {
  const card =
    document.createElement("article");

  card.className =
    "admin-summary-status-card admin-document-review-card";

  const heading =
    document.createElement("h5");

  heading.textContent =
    documentRecord.categoryTitle ||
    "Client Document";

  const fileName =
    createAdminDetailLine(
      "File",
      documentRecord.originalFileName
    );

  const taxYear =
    createAdminDetailLine(
      "Tax year",
      String(documentRecord.taxYear)
    );

  const fileType =
    createAdminDetailLine(
      "Type",
      documentRecord.mimeType
    );

  const fileSize =
    createAdminDetailLine(
      "Size",
      `${documentRecord.sizeBytes} bytes`
    );

  const uploaded =
    createAdminDetailLine(
      "Uploaded",
      formatAdminDate(
        documentRecord.uploadedAt
      )
    );

  const review =
    createAdminDetailLine(
      "Review status",
      formatAdminStatus(
        documentRecord.reviewStatus
      )
    );

  const actions =
    document.createElement("div");

  actions.className =
    "admin-document-review-actions";

  const downloadButton =
    document.createElement("button");

  downloadButton.type = "button";
  downloadButton.className =
    "btn secondary-btn";

  downloadButton.textContent =
    "Download Securely";

  downloadButton.addEventListener(
    "click",
    function () {
      downloadAdminDocument(
        clientId,
        documentRecord
      );
    }
  );

  actions.appendChild(downloadButton);

  const allowedStatuses =
    getAllowedReviewStatuses(
      documentRecord.reviewStatus
    );

  if (allowedStatuses.length > 0) {
    const statusSelect =
      document.createElement("select");

    const placeholder =
      document.createElement("option");

    placeholder.value = "";
    placeholder.textContent =
      "Select next review status";

    statusSelect.appendChild(
      placeholder
    );

    allowedStatuses.forEach(
      (status) => {
        const option =
          document.createElement("option");

        option.value = status;
        option.textContent =
          formatAdminStatus(status);

        statusSelect.appendChild(
          option
        );
      }
    );

    const updateButton =
      document.createElement("button");

    updateButton.type = "button";
    updateButton.className =
      "btn primary-btn";

    updateButton.textContent =
      "Update Review Status";

    updateButton.addEventListener(
      "click",
      function () {
        if (!statusSelect.value) {
          showAdminDocumentReviewMessage(
            "Select an allowed review status first.",
            "error"
          );

          return;
        }

        updateAdminDocumentReviewStatus(
          clientId,
          documentRecord.id,
          statusSelect.value
        );
      }
    );

    actions.appendChild(statusSelect);
    actions.appendChild(updateButton);
  }

  card.appendChild(heading);
  card.appendChild(fileName);
  card.appendChild(taxYear);
  card.appendChild(fileType);
  card.appendChild(fileSize);
  card.appendChild(uploaded);
  card.appendChild(review);
  card.appendChild(actions);

  return card;
}

async function updateAdminAppointmentStatus(
  clientId,
  appointmentId,
  status
) {
  try {
    await sendProtectedAdminJson(
      `/api/admin/clients/${
        encodeURIComponent(clientId)
      }/appointments/${
        encodeURIComponent(appointmentId)
      }/status`,
      "PATCH",
      {
        status
      }
    );

    showAdminAppointmentMessage(
      "Appointment status updated.",
      "success"
    );

    await loadAdminClientAppointments(
      clientId
    );
  } catch (error) {
    showAdminAppointmentMessage(
      error.message ||
        "The appointment status could not be updated.",
      "error"
    );
  }
}

function createAdminAppointmentCard(
  clientId,
  appointment
) {
  const card =
    document.createElement("article");

  card.className =
    "admin-summary-status-card admin-appointment-card";

  const heading =
    document.createElement("h5");

  heading.textContent =
    appointment.serviceType ||
    "Client Appointment";

  const appointmentStart =
    createAdminDetailLine(
      "Scheduled",
      formatAdminDateTime(
        appointment.appointmentStart
      )
    );

  const platform =
    createAdminDetailLine(
      "Consultation platform",
      appointment.platformType ||
        "Not available"
    );

  const duration =
    createAdminDetailLine(
      "Duration",
      Number.isFinite(
        Number(
          appointment.durationMinutes
        )
      )
        ? `${
            appointment.durationMinutes
          } minutes`
        : "Not available"
    );

  const status =
    createAdminDetailLine(
      "Status",
      formatAdminStatus(
        appointment.status
      )
    );

  card.appendChild(heading);
  card.appendChild(appointmentStart);
  card.appendChild(platform);
  card.appendChild(duration);
  card.appendChild(status);

  if (appointment.clientNotes) {
    card.appendChild(
      createAdminDetailLine(
        "Client notes",
        appointment.clientNotes
      )
    );
  }

  if (appointment.cancellationReason) {
    card.appendChild(
      createAdminDetailLine(
        "Cancellation reason",
        appointment.cancellationReason
      )
    );
  }

  if (appointment.confirmedAt) {
    card.appendChild(
      createAdminDetailLine(
        "Confirmed",
        formatAdminDateTime(
          appointment.confirmedAt
        )
      )
    );
  }

  if (appointment.completedAt) {
    card.appendChild(
      createAdminDetailLine(
        "Completed",
        formatAdminDateTime(
          appointment.completedAt
        )
      )
    );
  }

  if (appointment.cancelledAt) {
    card.appendChild(
      createAdminDetailLine(
        "Cancelled",
        formatAdminDateTime(
          appointment.cancelledAt
        )
      )
    );
  }

  const allowedStatuses =
    getAllowedAppointmentStatuses(
      appointment.status
    );

  if (allowedStatuses.length > 0) {
    const actions =
      document.createElement("div");

    actions.className =
      "admin-appointment-actions";

    const statusSelect =
      document.createElement("select");

    const placeholder =
      document.createElement("option");

    placeholder.value = "";
    placeholder.textContent =
      "Select next appointment status";

    statusSelect.appendChild(
      placeholder
    );

    allowedStatuses.forEach(
      (allowedStatus) => {
        const option =
          document.createElement("option");

        option.value =
          allowedStatus;

        option.textContent =
          formatAdminStatus(
            allowedStatus
          );

        statusSelect.appendChild(
          option
        );
      }
    );

    const updateButton =
      document.createElement("button");

    updateButton.type = "button";

    updateButton.className =
      "btn primary-btn";

    updateButton.textContent =
      "Update Appointment";

    updateButton.addEventListener(
      "click",
      async function () {
        if (!statusSelect.value) {
          showAdminAppointmentMessage(
            "Select an allowed appointment status first.",
            "error"
          );

          return;
        }

        updateButton.disabled = true;
        statusSelect.disabled = true;

        try {
          await updateAdminAppointmentStatus(
            clientId,
            appointment.id,
            statusSelect.value
          );
        } finally {
          updateButton.disabled = false;
          statusSelect.disabled = false;
        }
      }
    );

    actions.appendChild(
      statusSelect
    );

    actions.appendChild(
      updateButton
    );

    card.appendChild(actions);
  } else {
    const terminalStatus =
      document.createElement("p");

    terminalStatus.className =
      "admin-appointment-terminal";

    terminalStatus.textContent =
      `${formatAdminStatus(
        appointment.status
      )} appointments do not have another authorized status transition.`;

    card.appendChild(
      terminalStatus
    );
  }

  return card;
}

async function loadAdminClientAppointments(
  clientId
) {
  const target = getAdminElement(
    "adminAppointmentList"
  );

  clearAdminChildren(target);

  showAdminAppointmentMessage(
    "Loading authorized client appointments..."
  );

  try {
    const data =
      await fetchProtectedAdminJson(
        `/api/admin/clients/${
          encodeURIComponent(clientId)
        }/appointments`
      );

    if (
      !Array.isArray(
        data.appointments
      ) ||
      data.appointments.length === 0
    ) {
      showAdminAppointmentMessage(
        "No appointments are currently available for this client."
      );

      return;
    }

    data.appointments.forEach(
      (appointment) => {
        target.appendChild(
          createAdminAppointmentCard(
            clientId,
            appointment
          )
        );
      }
    );

    showAdminAppointmentMessage(
      `${data.appointments.length} appointment${
        data.appointments.length === 1
          ? ""
          : "s"
      } available for authorized management.`,
      "success"
    );
  } catch (error) {
    showAdminAppointmentMessage(
      error.message ||
        "The client appointment list could not be loaded.",
      "error"
    );
  }
}

async function loadAdminClientDocuments(
  clientId
) {
  const target = getAdminElement(
    "adminDocumentReviewList"
  );

  clearAdminChildren(target);

  showAdminDocumentReviewMessage(
    "Loading authorized document review..."
  );

  try {
    const data =
      await fetchProtectedAdminJson(
        `/api/admin/clients/${
          encodeURIComponent(clientId)
        }/documents`
      );

    if (
      !Array.isArray(data.documents) ||
      data.documents.length === 0
    ) {
      showAdminDocumentReviewMessage(
        "No stored documents are currently available for this client."
      );

      return;
    }

    data.documents.forEach(
      (documentRecord) => {
        target.appendChild(
          createAdminDocumentReviewCard(
            clientId,
            documentRecord
          )
        );
      }
    );

    showAdminDocumentReviewMessage(
      `${data.documents.length} stored document${
        data.documents.length === 1
          ? ""
          : "s"
      } available for authorized review.`,
      "success"
    );
  } catch (error) {
    showAdminDocumentReviewMessage(
      error.message ||
        "The document review list could not be loaded.",
      "error"
    );
  }
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
    "Authorized client workflow summary loaded.",
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

    await loadAdminClientAppointments(
      clientId
    );

    await loadAdminClientDocuments(
      clientId
    );

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

function setupAdminAuditControls() {
  const auditButton =
    getAdminElement(
      "adminAuditActivityButton"
    );

  const section =
    getAdminElement(
      "adminAuditActivitySection"
    );

  const previousButton =
    getAdminElement(
      "adminAuditPreviousPage"
    );

  const nextButton =
    getAdminElement(
      "adminAuditNextPage"
    );

  if (auditButton) {
    auditButton.addEventListener(
      "click",
      async function () {
        if (
          !adminAuditState.accessEnabled
        ) {
          return;
        }

        if (section) {
          section.hidden = false;

          section.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }

        await loadAdminAuditActivity(1);
      }
    );
  }

  if (previousButton) {
    previousButton.addEventListener(
      "click",
      async function () {
        const pagination =
          adminAuditState.pagination;

        if (
          !pagination?.hasPreviousPage
        ) {
          return;
        }

        await loadAdminAuditActivity(
          Math.max(
            1,
            pagination.page - 1
          )
        );
      }
    );
  }

  if (nextButton) {
    nextButton.addEventListener(
      "click",
      async function () {
        const pagination =
          adminAuditState.pagination;

        if (
          !pagination?.hasNextPage
        ) {
          return;
        }

        await loadAdminAuditActivity(
          pagination.page + 1
        );
      }
    );
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
    handleAdminAuthorizationFailure(401);
    return;
  }

  showAdminAccessMessage(
    "Confirming your protected administrator session..."
  );

  let response;

  try {
    response = await fetch("/api/admin/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  } catch (error) {
    showAdminAccessMessage(
      "The Mega Financial server could not be reached. " +
        "Your administrator session has been preserved. " +
        "Please try again when the service is available.",
      "error"
    );

    return;
  }

  if (
    response.status === 401 ||
    response.status === 403
  ) {
    handleAdminAuthorizationFailure(
      response.status
    );

    return;
  }

  if (!response.ok) {
    showAdminAccessMessage(
      "Administrator verification is temporarily unavailable. " +
        "Your stored session has been preserved.",
      "error"
    );

    return;
  }

  let data;

  try {
    data = await response.json();
  } catch (error) {
    showAdminAccessMessage(
      "The administrator service returned an unreadable response. " +
        "Your stored session has been preserved.",
      "error"
    );

    return;
  }

  if (!data || !data.admin) {
    showAdminAccessMessage(
      "Administrator verification could not be completed. " +
        "Your stored session has been preserved.",
      "error"
    );

    return;
  }

  displayAdminIdentity(data.admin);

  configureAdminAuditAccess(
    data.admin
  );

  showAdminAccessMessage(
    "Administrator session confirmed. Protected client workflow access is active.",
    "success"
  );

  await loadAdminClientDirectory(1);

  await loadAdminClientDirectory(1);
}

setupAdminLogoutButton();
setupAdminDirectoryControls();
setupAdminAuditControls();
verifyAdminSession();

window.megaFinancialAdminGuard = {
  getStoredAdminToken,
  clearAdminSession,
  verifyAdminSession,
  loadAdminClientDirectory,
  loadAdminClientSummary,
  loadAdminClientAppointments,
  loadAdminAuditActivity
};
