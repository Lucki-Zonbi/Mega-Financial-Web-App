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

loadDashboardIntakeStatus();
