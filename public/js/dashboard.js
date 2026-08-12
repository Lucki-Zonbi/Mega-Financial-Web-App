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

const isDashboardAdminPreview =
  window.megaFinancialClientGuard
    ?.isAdminPreviewMode?.() === true;

if (isDashboardAdminPreview) {
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
}
