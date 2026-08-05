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

const documentMetadataForm = document.getElementById(
  "documentMetadataForm"
);

const metadataTaxYear = document.getElementById(
  "metadataTaxYear"
);

const metadataChecklistKey = document.getElementById(
  "metadataChecklistKey"
);

const metadataOriginalFileName = document.getElementById(
  "metadataOriginalFileName"
);

const metadataMimeType = document.getElementById(
  "metadataMimeType"
);

const metadataSizeBytes = document.getElementById(
  "metadataSizeBytes"
);

const documentMetadataSubmitButton = document.getElementById(
  "documentMetadataSubmitButton"
);

const documentMetadataFormMessage = document.getElementById(
  "documentMetadataFormMessage"
);

let protectedDocumentChecklist = [];

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

  protectedDocumentChecklist =
    Array.isArray(checklist) ? checklist : [];

  populateMetadataCategoryOptions(
    protectedDocumentChecklist
  );

  documentChecklistGrid.replaceChildren();

  protectedDocumentChecklist.forEach((item) => {
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

function setMetadataFormMessage(message, type = "info") {
  if (!documentMetadataFormMessage) {
    return;
  }

  documentMetadataFormMessage.textContent = message;
  documentMetadataFormMessage.className =
    `auth-message metadata-form-message ${type}`;
}

function setMetadataFormAvailability({
  enabled,
  optionText
}) {
  if (metadataChecklistKey) {
    metadataChecklistKey.disabled = !enabled;

    if (!enabled && optionText) {
      metadataChecklistKey.replaceChildren();

      const option = document.createElement("option");
      option.value = "";
      option.textContent = optionText;

      metadataChecklistKey.append(option);
    }
  }

  if (documentMetadataSubmitButton) {
    documentMetadataSubmitButton.disabled = !enabled;
  }
}

function populateMetadataCategoryOptions(checklist) {
  if (!metadataChecklistKey) {
    return;
  }

  metadataChecklistKey.replaceChildren();

  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent =
    "Select a required document category";

  metadataChecklistKey.append(placeholderOption);

  checklist.forEach((item) => {
    const option = document.createElement("option");

    option.value = item.key;
    option.textContent = item.title;

    metadataChecklistKey.append(option);
  });

  const hasChecklistItems = checklist.length > 0;

  metadataChecklistKey.disabled = !hasChecklistItems;

  if (documentMetadataSubmitButton) {
    documentMetadataSubmitButton.disabled = !hasChecklistItems;
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

function buildMetadataPayload() {
  return {
    taxYear: Number(metadataTaxYear.value),
    checklistKey: metadataChecklistKey.value,
    originalFileName:
      metadataOriginalFileName.value.trim(),
    mimeType: metadataMimeType.value,
    sizeBytes: Number(metadataSizeBytes.value)
  };
}

function validateMetadataPayload(payload) {
  if (
    !Number.isInteger(payload.taxYear) ||
    payload.taxYear < 2000 ||
    payload.taxYear > 2100
  ) {
    return "Enter a valid tax year between 2000 and 2100.";
  }

  const categoryIsProtected =
    protectedDocumentChecklist.some(
      (item) => item.key === payload.checklistKey
    );

  if (!categoryIsProtected) {
    return "Select a category from your protected document checklist.";
  }

  if (
    !payload.originalFileName ||
    payload.originalFileName.length > 255
  ) {
    return "Enter an original filename between 1 and 255 characters.";
  }

  const allowedMimeTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png"
  ];

  if (!allowedMimeTypes.includes(payload.mimeType)) {
    return "Select PDF, JPEG, or PNG metadata.";
  }

  if (
    !Number.isInteger(payload.sizeBytes) ||
    payload.sizeBytes < 1 ||
    payload.sizeBytes > 10485760
  ) {
    return "Enter a size between 1 byte and 10 MB.";
  }

  return null;
}

async function submitDocumentMetadata(event) {
  event.preventDefault();

  const token = getDocumentsToken();

  if (!token) {
    setMetadataFormMessage(
      "Your client session is missing. Please log in again.",
      "error"
    );

    setMetadataFormAvailability({
      enabled: false,
      optionText: "Client session required"
    });

    return;
  }

  const metadataPayload = buildMetadataPayload();

  const validationMessage =
    validateMetadataPayload(metadataPayload);

  if (validationMessage) {
    setMetadataFormMessage(
      validationMessage,
      "error"
    );

    return;
  }

  const originalButtonText =
    documentMetadataSubmitButton.textContent;

  try {
    documentMetadataSubmitButton.disabled = true;
    documentMetadataSubmitButton.textContent =
      "Preparing Metadata...";

    setMetadataFormMessage(
      "Preparing protected metadata. No file is being transferred.",
      "info"
    );

    const response = await fetch(
      "/api/document-metadata",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(metadataPayload)
      }
    );

    const data = await response.json();

    if (response.status === 401) {
      clearDocumentsSession();

      setMetadataFormAvailability({
        enabled: false,
        optionText: "Session expired"
      });

      setMetadataFormMessage(
        data.message ||
          "Your session expired. Please log in again.",
        "error"
      );

      setTimeout(() => {
        window.location.href = "./login.html";
      }, 1200);

      return;
    }

    if (response.status === 403) {
      setMetadataFormMessage(
        data.message ||
          "Only client accounts may prepare document metadata.",
        "error"
      );

      return;
    }

    if (!response.ok) {
      setMetadataFormMessage(
        data.message ||
          "Unable to prepare the document metadata.",
        "error"
      );

      return;
    }

    setMetadataFormMessage(
      data.message ||
        "Document metadata was prepared. No file was uploaded or stored.",
      "success"
    );

    metadataOriginalFileName.value = "";
    metadataMimeType.value = "";
    metadataSizeBytes.value = "";

    await loadDocumentMetadataDrafts();
  } catch (error) {
    setMetadataFormMessage(
      "Unable to connect to the metadata server. No file was transferred.",
      "error"
    );
  } finally {
    if (documentMetadataSubmitButton) {
      documentMetadataSubmitButton.textContent =
        originalButtonText;

      documentMetadataSubmitButton.disabled =
        protectedDocumentChecklist.length === 0;
    }
  }
}

async function loadDocumentChecklist() {
  if (!documentChecklistGrid) return;

  const token = getDocumentsToken();

    if (!token) {
    setMetadataFormAvailability({
      enabled: false,
      optionText: "Log in to load required categories"
    });

    setMetadataFormMessage(
      "Please log in before preparing document metadata.",
      "error"
    );

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

      setMetadataFormAvailability({
        enabled: false,
        optionText: "Session expired"
      });

      setMetadataFormMessage(
        data.message ||
          "Your session expired. Please log in again.",
        "error"
      );

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
      protectedDocumentChecklist = [];

      setMetadataFormAvailability({
        enabled: false,
        optionText: "Complete your intake first"
      });

      setMetadataFormMessage(
        data.message ||
          "Complete your 2026 tax intake before preparing document metadata.",
        "error"
      );

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

if (documentMetadataForm) {
  documentMetadataForm.addEventListener(
    "submit",
    submitDocumentMetadata
  );
}

loadDocumentChecklist();
loadDocumentMetadataDrafts();
