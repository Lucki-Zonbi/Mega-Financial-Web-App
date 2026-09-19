const dashboardIntakeStatus = document.getElementById(
  "dashboardIntakeStatus"
);

const dashboardIntakeNote = document.getElementById(
  "dashboardIntakeNote"
);

const dashboardIntakeLink = document.getElementById(
  "dashboardIntakeLink"
);

const dashboardQuickIntakeLink = document.getElementById(
  "dashboardQuickIntakeLink"
);

const dashboardChecklistStatus = document.getElementById(
  "dashboardChecklistStatus"
);

const dashboardChecklistNote = document.getElementById(
  "dashboardChecklistNote"
);

const dashboardAppointmentStatus =
  document.getElementById(
    "dashboardAppointmentStatus"
  );

const dashboardAppointmentNote =
  document.getElementById(
    "dashboardAppointmentNote"
  );

const dashboardMessageList =
  document.getElementById(
    "dashboardMessageList"
  );

const dashboardMessageForm =
  document.getElementById(
    "dashboardMessageForm"
  );

const dashboardMessageText =
  document.getElementById(
    "dashboardMessageText"
  );

const dashboardMessageCount =
  document.getElementById(
    "dashboardMessageCount"
  );

const dashboardMessageSubmit =
  document.getElementById(
    "dashboardMessageSubmit"
  );

const dashboardMessageStatus =
  document.getElementById(
    "dashboardMessageStatus"
  );

const dashboardMessageNote =
  document.getElementById(
    "dashboardMessageNote"
  );

const dashboardNotificationList =
  document.getElementById(
    "dashboardNotificationList"
  );

const dashboardNotificationCount =
  document.getElementById(
    "dashboardNotificationCount"
  );

const dashboardNotificationStatus =
  document.getElementById(
    "dashboardNotificationStatus"
  );

function getDashboardToken() {
  if (window.megaFinancialClientGuard) {
    return window.megaFinancialClientGuard.getStoredToken();
  }

  return localStorage.getItem("megaFinancialToken");
}

function clearDashboardSession() {
  if (window.megaFinancialClientGuard) {
    window.megaFinancialClientGuard.clearClientSession();
  } else {
    localStorage.removeItem("megaFinancialToken");
    localStorage.removeItem("megaFinancialUser");
  }
}

function clearDashboardElementChildren(
  element
) {
  if (!element) {
    return;
  }

  while (element.firstChild) {
    element.removeChild(
      element.firstChild
    );
  }
}

function formatDashboardDateTime(value) {
  if (!value) {
    return "Date unavailable";
  }

  const parsedDate = new Date(value);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return "Date unavailable";
  }

  return parsedDate.toLocaleString(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }
  );
}

function showDashboardMessageStatus(
  message,
  type = ""
) {
  if (!dashboardMessageStatus) {
    return;
  }

  dashboardMessageStatus.textContent =
    message;

  dashboardMessageStatus.className =
    "auth-message";

  if (type) {
    dashboardMessageStatus.classList.add(
      type
    );
  }

  dashboardMessageStatus.hidden =
    !message;
}

function showDashboardNotificationStatus(
  message,
  type = ""
) {
  if (!dashboardNotificationStatus) {
    return;
  }

  dashboardNotificationStatus.textContent =
    message;

  dashboardNotificationStatus.className =
    "auth-message";

  if (type) {
    dashboardNotificationStatus.classList.add(
      type
    );
  }

  dashboardNotificationStatus.hidden =
    !message;
}

function handleDashboardAuthorizationFailure(
  status
) {
  if (status === 401) {
    clearDashboardSession();

    setTimeout(() => {
      window.location.href =
        "./login.html";
    }, 1200);

    return;
  }

  if (status === 403) {
    return;
  }
}

function updateDashboardIntakeDisplay({
  message,
  note,
  linkText
}) {
  if (dashboardIntakeStatus) {
    dashboardIntakeStatus.textContent = message;
  }

  if (dashboardIntakeNote) {
    dashboardIntakeNote.textContent = note;
  }

  if (dashboardIntakeLink) {
    dashboardIntakeLink.textContent = linkText;
  }

  if (dashboardQuickIntakeLink) {
    dashboardQuickIntakeLink.textContent = linkText;
  }
}

function getIntakeStatusDisplay(status) {
  const statusDisplays = {
    submitted: {
      message:
        "Your 2026 tax intake has been submitted and is ready for future review.",
      note: "Intake submitted",
      linkText: "Review Tax Intake"
    },

    under_review: {
      message:
        "Your 2026 tax intake is currently under review by Mega Financial.",
      note: "Intake under review",
      linkText: "View Tax Intake"
    },

    completed: {
      message:
        "Your 2026 tax intake has been marked complete.",
      note: "Intake completed",
      linkText: "View Tax Intake"
    }
  };

  return statusDisplays[status] || statusDisplays.submitted;
}

function updateDashboardAppointmentDisplay(
  message,
  note
) {
  if (dashboardAppointmentStatus) {
    dashboardAppointmentStatus.textContent =
      message;
  }

  if (dashboardAppointmentNote) {
    dashboardAppointmentNote.textContent =
      note;
  }
}

function formatDashboardAppointmentDate(
  value
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }
  ).format(date);
}

async function loadDashboardAppointmentStatus() {
  if (!dashboardAppointmentStatus) {
    return;
  }

  const token = getDashboardToken();

  if (!token) {
    updateDashboardAppointmentDisplay(
      "Please log in to view your appointment status.",
      "Client session required"
    );

    return;
  }

  try {
    const response = await fetch(
      "/api/appointments/me/upcoming",
      {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${token}`
        }
      }
    );

    const data = await response.json();

    if (response.status === 401) {
      clearDashboardSession();

      updateDashboardAppointmentDisplay(
        data.message ||
          "Your session expired. Please log in again.",
        "Session expired"
      );

      setTimeout(() => {
        window.location.href =
          "./login.html";
      }, 1200);

      return;
    }

    if (response.status === 403) {
      updateDashboardAppointmentDisplay(
        data.message ||
          "Only authorized clients may view appointments.",
        "Authorization required"
      );

      return;
    }

    if (!response.ok) {
      updateDashboardAppointmentDisplay(
        data.message ||
          "Unable to retrieve your upcoming appointment.",
        "Appointment unavailable"
      );

      return;
    }

    if (!data.appointment) {
      updateDashboardAppointmentDisplay(
        "No upcoming appointment is currently scheduled.",
        "No active appointment"
      );

      return;
    }

    const readableStatus =
      String(
        data.appointment.status || ""
      )
        .split("_")
        .join(" ");

    updateDashboardAppointmentDisplay(
      `${
        data.appointment.serviceType
      } via ${
        data.appointment.platformType
      } on ${
        formatDashboardAppointmentDate(
          data.appointment.appointmentStart
        )
      }.`,
      `Status: ${readableStatus}`
    );
  } catch (error) {
    updateDashboardAppointmentDisplay(
      "Unable to connect to the appointment server.",
      "Connection unavailable"
    );
  }
}

function updateDashboardChecklistDisplay(message, note) {
  if (dashboardChecklistStatus) {
    dashboardChecklistStatus.textContent = message;
  }

  if (dashboardChecklistNote) {
    dashboardChecklistNote.textContent = note;
  }
}

async function loadDashboardChecklistStatus() {
  if (!dashboardChecklistStatus) {
    return;
  }

  const token = getDashboardToken();

  if (!token) {
    updateDashboardChecklistDisplay(
      "Please log in to view your required document checklist.",
      "Client session required"
    );

    return;
  }

  try {
    const response = await fetch(
      "/api/intake/checklist?taxYear=2026",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await response.json();

    if (response.status === 401) {
      clearDashboardSession();

      updateDashboardChecklistDisplay(
        data.message || "Your session expired. Please log in again.",
        "Session expired"
      );

      return;
    }

    if (response.status === 404) {
      updateDashboardChecklistDisplay(
        "Complete your 2026 tax intake to generate a personalized checklist.",
        "No checklist available"
      );

      return;
    }

    if (!response.ok) {
      updateDashboardChecklistDisplay(
        data.message || "Unable to retrieve your document checklist.",
        "Checklist unavailable"
      );

      return;
    }

    const categoryLabel =
      data.checklistCount === 1
        ? "required category"
        : "required categories";

    updateDashboardChecklistDisplay(
      `${data.checklistCount} ${categoryLabel} currently match your 2026 intake.`,
      "Protected checklist ready"
    );
  } catch (error) {
    updateDashboardChecklistDisplay(
      "Unable to connect to the checklist server. Make sure the server is running.",
      "Connection unavailable"
    );
  }
}

async function loadDashboardIntakeStatus() {
  if (!dashboardIntakeStatus) {
    return;
  }

  const token = getDashboardToken();

  if (!token) {
    updateDashboardIntakeDisplay({
      message: "Please log in to view your tax intake status.",
      note: "Client session required",
      linkText: "Log In"
    });

    if (dashboardIntakeLink) {
      dashboardIntakeLink.href = "./login.html";
    }

    return;
  }

  try {
    const response = await fetch("/api/intake/me?taxYear=2026", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.status === 401) {
      clearDashboardSession();

      updateDashboardIntakeDisplay({
        message: data.message || "Your session expired. Please log in again.",
        note: "Session expired",
        linkText: "Log In"
      });

      if (dashboardIntakeLink) {
        dashboardIntakeLink.href = "./login.html";
      }

      setTimeout(() => {
        window.location.href = "./login.html";
      }, 1200);

      return;
    }

    if (response.status === 404) {
      updateDashboardIntakeDisplay({
        message:
          "Your 2026 tax intake has not been started. Complete it when you are ready.",
        note: "No intake started",
        linkText: "Start Tax Intake"
      });

      return;
    }

    if (!response.ok) {
      updateDashboardIntakeDisplay({
        message:
          data.message || "Unable to retrieve your tax intake status.",
        note: "Status unavailable",
        linkText: "Open Tax Intake"
      });

      return;
    }

    updateDashboardIntakeDisplay(
      getIntakeStatusDisplay(data.intake.status)
    );
  } catch (error) {
    updateDashboardIntakeDisplay({
      message:
        "Unable to connect to the intake server. Make sure the server is running.",
      note: "Connection unavailable",
      linkText: "Open Tax Intake"
    });
  }
}

function createDashboardMessageCard(
  portalMessage
) {
  const card =
    document.createElement("article");

  const sender =
    document.createElement("strong");

  const messageText =
    document.createElement("p");

  const timestamp =
    document.createElement("span");

  const isClientMessage =
    portalMessage.senderRole ===
    "client";

  card.className =
    "portal-message-card";

  card.classList.add(
    isClientMessage
      ? "client-message"
      : "admin-message"
  );

  sender.textContent =
    isClientMessage
      ? "You"
      : "Mega Financial";

  messageText.textContent =
    portalMessage.messageText ||
    "";

  timestamp.className =
    "dashboard-note";

  timestamp.textContent =
    formatDashboardDateTime(
      portalMessage.createdAt
    );

  card.appendChild(sender);
  card.appendChild(messageText);
  card.appendChild(timestamp);

  return card;
}

function renderDashboardMessages(
  messages
) {
  if (!dashboardMessageList) {
    return;
  }

  clearDashboardElementChildren(
    dashboardMessageList
  );

  if (
    !Array.isArray(messages) ||
    messages.length === 0
  ) {
    const emptyState =
      document.createElement("p");

    emptyState.className =
      "portal-message-empty";

    emptyState.textContent =
      "No secure portal messages yet.";

    dashboardMessageList.appendChild(
      emptyState
    );

    if (dashboardMessageNote) {
      dashboardMessageNote.textContent =
        "No messages yet";
    }

    return;
  }

  messages.forEach(
    (portalMessage) => {
      dashboardMessageList.appendChild(
        createDashboardMessageCard(
          portalMessage
        )
      );
    }
  );

  if (dashboardMessageNote) {
    dashboardMessageNote.textContent =
      `${messages.length} recent message${
        messages.length === 1
          ? ""
          : "s"
      }`;
  }

  dashboardMessageList.scrollTop =
    dashboardMessageList.scrollHeight;
}

async function loadDashboardMessages() {
  if (!dashboardMessageList) {
    return;
  }

  const token = getDashboardToken();

  if (!token) {
    showDashboardMessageStatus(
      "Please log in to view secure messages.",
      "error"
    );

    return;
  }

  try {
    const response = await fetch(
      "/api/messages/me?limit=50",
      {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${token}`
        }
      }
    );

    let data;

    try {
      data = await response.json();
    } catch (error) {
      data = {
        success: false,
        message:
          "The message service returned an unreadable response."
      };
    }

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      handleDashboardAuthorizationFailure(
        response.status
      );

      showDashboardMessageStatus(
        data.message ||
          "Messaging authorization could not be confirmed.",
        "error"
      );

      return;
    }

    if (!response.ok) {
      showDashboardMessageStatus(
        data.message ||
          "Secure messages could not be loaded.",
        "error"
      );

      return;
    }

    renderDashboardMessages(
      data.messages
    );

    showDashboardMessageStatus("");
  } catch (error) {
    showDashboardMessageStatus(
      "The Mega Financial server could not be reached. Your stored session has been preserved.",
      "error"
    );
  }
}

async function sendDashboardMessage(
  messageText
) {
  const token = getDashboardToken();

  if (!token) {
    showDashboardMessageStatus(
      "Please log in before sending a message.",
      "error"
    );

    return false;
  }

  try {
    const response = await fetch(
      "/api/messages/me",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Authorization:
            `Bearer ${token}`
        },
        body: JSON.stringify({
          messageText
        })
      }
    );

    let data;

    try {
      data = await response.json();
    } catch (error) {
      data = {
        success: false,
        message:
          "The message service returned an unreadable response."
      };
    }

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      handleDashboardAuthorizationFailure(
        response.status
      );

      showDashboardMessageStatus(
        data.message ||
          "Messaging authorization could not be confirmed.",
        "error"
      );

      return false;
    }

    if (!response.ok) {
      showDashboardMessageStatus(
        data.message ||
          "Your secure message could not be sent.",
        "error"
      );

      return false;
    }

    showDashboardMessageStatus(
      data.message ||
        "Your secure message was sent.",
      "success"
    );

    await loadDashboardMessages();

    return true;
  } catch (error) {
    showDashboardMessageStatus(
      "The Mega Financial server could not be reached. Your stored session has been preserved.",
      "error"
    );

    return false;
  }
}

function setupDashboardMessaging() {
  if (
    !dashboardMessageForm ||
    !dashboardMessageText
  ) {
    return;
  }

  function updateCharacterCount() {
    if (!dashboardMessageCount) {
      return;
    }

    dashboardMessageCount.textContent =
      `${dashboardMessageText.value.length} / 2000 characters`;
  }

  dashboardMessageText.addEventListener(
    "input",
    updateCharacterCount
  );

  dashboardMessageForm.addEventListener(
    "submit",
    async function (event) {
      event.preventDefault();

      const messageText =
        dashboardMessageText.value.trim();

      if (
        !messageText ||
        messageText.length > 2000
      ) {
        showDashboardMessageStatus(
          "Message text must contain between 1 and 2000 characters.",
          "error"
        );

        return;
      }

      if (dashboardMessageSubmit) {
        dashboardMessageSubmit.disabled =
          true;

        dashboardMessageSubmit.textContent =
          "Sending...";
      }

      try {
        const sent =
          await sendDashboardMessage(
            messageText
          );

        if (sent) {
          dashboardMessageText.value =
            "";

          updateCharacterCount();
        }
      } finally {
        if (dashboardMessageSubmit) {
          dashboardMessageSubmit.disabled =
            false;

          dashboardMessageSubmit.textContent =
            "Send Secure Message";
        }
      }
    }
  );

  updateCharacterCount();
}

function createDashboardNotificationCard(
  notification
) {
  const card =
    document.createElement("article");

  const message =
    document.createElement("p");

  const timestamp =
    document.createElement("span");

  card.className =
    "portal-notification-card";

  if (!notification.isRead) {
    card.classList.add("unread");
  }

  message.textContent =
    notification.message ||
    "Portal notification";

  timestamp.className =
    "dashboard-note";

  timestamp.textContent =
    formatDashboardDateTime(
      notification.createdAt
    );

  card.appendChild(message);
  card.appendChild(timestamp);

  if (
    !notification.isRead &&
    notification.id
  ) {
    const readButton =
      document.createElement("button");

    readButton.type = "button";

    readButton.className =
      "btn secondary-btn portal-notification-read-btn";

    readButton.textContent =
      "Mark Read";

    readButton.addEventListener(
      "click",
      async function () {
        readButton.disabled = true;

        try {
          await markDashboardNotificationRead(
            notification.id
          );
        } finally {
          readButton.disabled = false;
        }
      }
    );

    card.appendChild(readButton);
  }

  return card;
}

function renderDashboardNotifications(
  notifications,
  unreadCount
) {
  if (!dashboardNotificationList) {
    return;
  }

  clearDashboardElementChildren(
    dashboardNotificationList
  );

  if (dashboardNotificationCount) {
    dashboardNotificationCount.textContent =
      `${unreadCount || 0} unread`;
  }

  if (
    !Array.isArray(notifications) ||
    notifications.length === 0
  ) {
    const emptyState =
      document.createElement("p");

    emptyState.className =
      "portal-message-empty";

    emptyState.textContent =
      "No in-app notifications yet.";

    dashboardNotificationList.appendChild(
      emptyState
    );

    return;
  }

  notifications.forEach(
    (notification) => {
      dashboardNotificationList.appendChild(
        createDashboardNotificationCard(
          notification
        )
      );
    }
  );
}

async function loadDashboardNotifications() {
  if (!dashboardNotificationList) {
    return;
  }

  const token = getDashboardToken();

  if (!token) {
    return;
  }

  try {
    const response = await fetch(
      "/api/notifications/me?limit=20",
      {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${token}`
        }
      }
    );

    let data;

    try {
      data = await response.json();
    } catch (error) {
      data = {
        success: false,
        message:
          "The notification service returned an unreadable response."
      };
    }

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      handleDashboardAuthorizationFailure(
        response.status
      );

      showDashboardNotificationStatus(
        data.message ||
          "Notification authorization could not be confirmed.",
        "error"
      );

      return;
    }

    if (!response.ok) {
      showDashboardNotificationStatus(
        data.message ||
          "Notifications could not be loaded.",
        "error"
      );

      return;
    }

    renderDashboardNotifications(
      data.notifications,
      data.unreadCount
    );

    showDashboardNotificationStatus("");
  } catch (error) {
    showDashboardNotificationStatus(
      "The notification service could not be reached. Your stored session has been preserved.",
      "error"
    );
  }
}

async function markDashboardNotificationRead(
  notificationId
) {
  const token = getDashboardToken();

  if (!token) {
    return;
  }

  try {
    const response = await fetch(
      `/api/notifications/${
        encodeURIComponent(
          notificationId
        )
      }/read`,
      {
        method: "PATCH",
        headers: {
          Authorization:
            `Bearer ${token}`
        }
      }
    );

    let data;

    try {
      data = await response.json();
    } catch (error) {
      data = {
        success: false,
        message:
          "The notification service returned an unreadable response."
      };
    }

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      handleDashboardAuthorizationFailure(
        response.status
      );

      return;
    }

    if (!response.ok) {
      showDashboardNotificationStatus(
        data.message ||
          "The notification could not be updated.",
        "error"
      );

      return;
    }

    await loadDashboardNotifications();
  } catch (error) {
    showDashboardNotificationStatus(
      "The notification service could not be reached. Your stored session has been preserved.",
      "error"
    );
  }
}

const isDashboardAdminPreview =
  window.megaFinancialClientGuard
    ?.isAdminPreviewMode?.() === true;

setupDashboardMessaging();

if (isDashboardAdminPreview) {
  if (dashboardMessageText) {
    dashboardMessageText.disabled =
      true;

    dashboardMessageText.placeholder =
      "Secure messaging is disabled during Executive Admin Preview.";
  }

  if (dashboardMessageSubmit) {
    dashboardMessageSubmit.disabled =
      true;
  }

  if (dashboardMessageNote) {
    dashboardMessageNote.textContent =
      "Executive Admin Preview";
  }

  showDashboardMessageStatus(
    "Secure client messaging is disabled during Executive Admin Preview.",
    "success"
  );

  if (dashboardNotificationCount) {
    dashboardNotificationCount.textContent =
      "Executive Admin Preview";
  }

  showDashboardNotificationStatus(
    "Client notifications are not loaded during Executive Admin Preview.",
    "success"
  );

  updateDashboardIntakeDisplay({
    message:
      "Client tax-intake status appears here during normal client use.",
    note:
      "Executive Admin Preview",
    linkText:
      "Preview Tax Intake"
  });

  updateDashboardChecklistDisplay(
    "Client required-document checklist status appears here during normal client use.",
    "Executive Admin Preview"
  );

  updateDashboardAppointmentDisplay(
    "The client's next upcoming appointment appears here during normal client use.",
    "Executive Admin Preview"
  );
} else {
  loadDashboardIntakeStatus();
  loadDashboardChecklistStatus();
  loadDashboardAppointmentStatus();
  loadDashboardMessages();
  loadDashboardNotifications();
}
}
