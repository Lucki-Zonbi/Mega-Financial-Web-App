const documentChecklistGrid = document.getElementById(
  "documentChecklistGrid"
);

const documentChecklistMessage = document.getElementById(
  "documentChecklistMessage"
);

const documentsChecklistStatus = document.getElementById(
  "documentsChecklistStatus"
);

const documentsChecklistCount = document.getElementById(
  "documentsChecklistCount"
);

const documentsChecklistNote = document.getElementById(
  "documentsChecklistNote"
);

const documentMetadataGrid = document.getElementById(
  "documentMetadataGrid"
);

const documentMetadataMessage = document.getElementById(
  "documentMetadataMessage"
);

function getDocumentsToken() {
  if (window.megaFinancialClientGuard) {
    return window.megaFinancialClientGuard.getStoredToken();
  }

  return localStorage.getItem("megaFinancialToken");
}

function clearDocumentsSession() {
  if (window.megaFinancialClientGuard) {
    window.megaFinancialClientGuard.clearClientSession();
  } else {
    localStorage.removeItem("megaFinancialToken");
    localStorage.removeItem("megaFinancialUser");
  }
}

function setChecklistStatus({ title, count, note, message }) {
  if (documentsChecklistStatus) {
    documentsChecklistStatus.textContent = title;
  }

  if (documentsChecklistCount) {
    documentsChecklistCount.textContent = count;
  }

  if (documentsChecklistNote) {
    documentsChecklistNote.textContent = note;
  }

  if (documentChecklistMessage) {
    documentChecklistMessage.textContent = message;
  }
}

function renderChecklistState(title, description, link) {
  if (!documentChecklistGrid) return;

  documentChecklistGrid.replaceChildren();

  const card = document.createElement("article");
  card.className = "future-card document-checklist-state";

  const heading = document.createElement("h3");
  heading.textContent = title;

  const paragraph = document.createElement("p");
  paragraph.textContent = description;

  card.append(heading, paragraph);

  if (link) {
    const action = document.createElement("a");

    action.href = link.href;
    action.className = "btn primary-btn document-checklist-link";
    action.textContent = link.text;

    card.append(action);
  }

  documentChecklistGrid.append(card);
}

function renderChecklistItems(checklist) {
  if (!documentChecklistGrid) return;

  documentChecklistGrid.replaceChildren();

  checklist.forEach((item) => {
    const card = document.createElement("article");
    card.className = "future-card document-checklist-item";

    const heading = document.createElement("h3");
    heading.textContent = item.title;

    const paragraph = document.createElement("p");
    paragraph.textContent = item.description;

    const label = document.createElement("span");
    label.className = "dashboard-note";
    label.textContent = "Required from saved intake";

    card.append(heading, paragraph, label);
    documentChecklistGrid.append(card);
  });
}

function setMetadataMessage(message) {
  if (documentMetadataMessage) {
    documentMetadataMessage.textContent = message;
  }
}

function renderMetadataState(
  title,
  description
) {
  if (!documentMetadataGrid) {
    return;
  }

  documentMetadataGrid.replaceChildren();

  const card = document.createElement("article");
  card.className =
    "future-card document-checklist-state";

  const heading = document.createElement("h3");
  heading.textContent = title;

  const paragraph =
    document.createElement("p");

  paragraph.textContent = description;

  card.append(heading, paragraph);
  documentMetadataGrid.append(card);
}

function renderMetadataDrafts(
  metadataDrafts
) {
  if (!documentMetadataGrid) {
    return;
  }

  documentMetadataGrid.replaceChildren();

  metadataDrafts.forEach(
    (metadataDraft) => {
      const card =
        document.createElement("article");

      card.className =
        "future-card document-checklist-item";

      const heading =
        document.createElement("h3");

      heading.textContent =
        metadataDraft.originalFileName;

      const details =
        document.createElement("p");

      details.textContent =
        `${metadataDraft.checklistKey} • ${metadataDraft.mimeType} • ${metadataDraft.sizeBytes} bytes`;

      const status =
        document.createElement("span");

      status.className = "dashboard-note";
      status.textContent =
        "Pending metadata only — no file uploaded";

      card.append(
        heading,
        details,
        status
      );

      documentMetadataGrid.append(card);
    }
  );
}

async function loadDocumentMetadataDrafts() {
  if (!documentMetadataGrid) {
    return;
  }

  const token = getDocumentsToken();

  if (!token) {
    setMetadataMessage(
      "Please log in to view protected document metadata drafts."
    );

    renderMetadataState(
      "Client session required",
      "No document metadata was retrieved."
    );

    return;
  }

  try {
    const response = await fetch(
      "/api/document-metadata?taxYear=2026",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await response.json();

    if (response.status === 401) {
      clearDocumentsSession();

      setMetadataMessage(
        data.message ||
          "Your session expired. Please log in again."
      );

      renderMetadataState(
        "Session expired",
        "Pending metadata could not be retrieved."
      );

      return;
    }

    if (!response.ok) {
      setMetadataMessage(
        data.message ||
          "Pending metadata could not be retrieved."
      );

      renderMetadataState(
        "Metadata unavailable",
        "No file-upload status is being reported."
      );

      return;
    }

    if (
      !Array.isArray(
        data.metadataDrafts
      ) ||
      data.metadataDrafts.length === 0
    ) {
      setMetadataMessage(
        "No pending metadata drafts exist for your 2026 intake."
      );

      renderMetadataState(
        "No metadata drafts",
        "No files have been uploaded through this page."
      );

      return;
    }

    setMetadataMessage(
      `${data.count} pending metadata ${
        data.count === 1
          ? "draft was"
          : "drafts were"
      } found. These records are not uploaded files.`
    );

    renderMetadataDrafts(
      data.metadataDrafts
    );
  } catch (error) {
    setMetadataMessage(
      "Unable to connect to the metadata server."
    );

    renderMetadataState(
      "Metadata unavailable",
      "Make sure the Mega Financial server is running. No upload was attempted."
    );
  }
}

async function loadDocumentChecklist() {
  if (!documentChecklistGrid) return;

  const token = getDocumentsToken();

  if (!token) {
    renderChecklistState(
      "Client session required",
      "Please log in to view your protected document checklist.",
      {
        href: "./login.html",
        text: "Log In"
      }
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
      clearDocumentsSession();

      setChecklistStatus({
        title: "Session Expired",
        count: "Unavailable",
        note: data.message || "Please log in again.",
        message:
          "Your protected checklist could not be loaded because the session is invalid."
      });

      renderChecklistState(
        "Session expired",
        data.message || "Please log in again to view your checklist.",
        {
          href: "./login.html",
          text: "Log In Again"
        }
      );

      setTimeout(() => {
        window.location.href = "./login.html";
      }, 1200);

      return;
    }

    if (response.status === 404) {
      setChecklistStatus({
        title: "Intake Required",
        count: "0",
        note: "No saved 2026 intake was found.",
        message:
          "Complete your 2026 tax intake to generate a personalized required-document checklist."
      });

      renderChecklistState(
        "Complete your tax intake",
        data.message ||
          "A saved intake is required before the checklist can be generated.",
        {
          href: "./intake.html",
          text: "Complete Tax Intake"
        }
      );

      return;
    }

    if (!response.ok) {
      throw new Error(
        data.message || "Unable to retrieve the checklist."
      );
    }

    setChecklistStatus({
      title: "Checklist Ready",
      count: String(data.checklistCount),
      note: `Generated from your saved ${data.taxYear} intake.`,
      message:
        "Review each required category below. Upload processing is not active yet."
    });

    renderChecklistItems(data.checklist);
  } catch (error) {
    setChecklistStatus({
      title: "Checklist Unavailable",
      count: "Unavailable",
      note: "The checklist server could not be reached.",
      message:
        "Make sure the Mega Financial server is running, then refresh this page."
    });

    renderChecklistState(
      "Unable to load checklist",
      error.message ||
        "A connection error prevented checklist retrieval."
    );
  }
}

loadDocumentChecklist();
loadDocumentMetadataDrafts();
