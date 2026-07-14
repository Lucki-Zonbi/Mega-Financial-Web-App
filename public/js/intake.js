const taxIntakeForm = document.getElementById("taxIntakeForm");
const intakeMessage = document.getElementById("intakeMessage");
const intakeSubmitButton = document.getElementById("intakeSubmitButton");

function showIntakeMessage(message, type = "info") {
  if (!intakeMessage) return;

  intakeMessage.textContent = message;
  intakeMessage.className = `auth-message ${type}`;
}

function getIntakeToken() {
  if (window.megaFinancialClientGuard) {
    return window.megaFinancialClientGuard.getStoredToken();
  }

  return localStorage.getItem("megaFinancialToken");
}

function getStoredClient() {
  if (window.megaFinancialClientGuard) {
    return window.megaFinancialClientGuard.getStoredUser();
  }

  const storedUser = localStorage.getItem("megaFinancialUser");

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch (error) {
    return null;
  }
}

function prefillClientContactInformation() {
  if (!taxIntakeForm) return;

  const user = getStoredClient();

  if (!user) return;

  const emailInput = document.getElementById("email");
  const phoneInput = document.getElementById("phone");

  if (emailInput && !emailInput.value) {
    emailInput.value = user.email || "";
  }

  if (phoneInput && !phoneInput.value) {
    phoneInput.value = user.phone || "";
  }

  const fullNameParts = String(user.fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const firstNameInput = document.getElementById("firstName");
  const lastNameInput = document.getElementById("lastName");

  if (firstNameInput && !firstNameInput.value && fullNameParts.length > 0) {
    firstNameInput.value = fullNameParts[0];
  }

  if (lastNameInput && !lastNameInput.value && fullNameParts.length > 1) {
    lastNameInput.value = fullNameParts.slice(1).join(" ");
  }
}

function getCheckedValues(formData, fieldName) {
  return formData
    .getAll(fieldName)
    .map((value) => String(value).trim())
    .filter(Boolean);
}

function buildIntakePayload() {
  const formData = new FormData(taxIntakeForm);

  return {
    taxYear: Number(formData.get("taxYear")),

    clientInformation: {
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      filingStatus: formData.get("filingStatus")
    },

    employmentTypes: getCheckedValues(formData, "employmentTypes"),
    incomeSources: getCheckedValues(formData, "incomeSources"),
    familyInformation: getCheckedValues(formData, "familyInformation"),
    businessInformation: getCheckedValues(formData, "businessInformation"),
    servicesNeeded: getCheckedValues(formData, "servicesNeeded"),
    additionalNotes: formData.get("taxNotes")
  };
}

async function submitTaxIntake(event) {
  event.preventDefault();

  const token = getIntakeToken();

  if (!token) {
    showIntakeMessage(
      "Your session is missing. Please log in before submitting the intake form.",
      "error"
    );

    setTimeout(() => {
      window.location.href = "./login.html";
    }, 1200);

    return;
  }

  const intakeData = buildIntakePayload();

  try {
    intakeSubmitButton.disabled = true;
    intakeSubmitButton.textContent = "Saving Intake...";

    showIntakeMessage("Saving your protected tax intake...", "info");

    const response = await fetch("/api/intake", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(intakeData)
    });

    const data = await response.json();

    if (response.status === 401) {
      if (window.megaFinancialClientGuard) {
        window.megaFinancialClientGuard.clearClientSession();
      }

      showIntakeMessage(
        data.message || "Your session expired. Please log in again.",
        "error"
      );

      setTimeout(() => {
        window.location.href = "./login.html";
      }, 1200);

      return;
    }

    if (!response.ok) {
      showIntakeMessage(
        data.message || "Unable to save the tax intake.",
        "error"
      );

      return;
    }

    showIntakeMessage(
      data.message || "Tax intake saved successfully.",
      "success"
    );
  } catch (error) {
    showIntakeMessage(
      "Unable to connect to the intake server. Make sure npm start is running.",
      "error"
    );
  } finally {
    intakeSubmitButton.disabled = false;
    intakeSubmitButton.textContent = "Save Tax Intake";
  }
}

if (taxIntakeForm) {
  prefillClientContactInformation();
  taxIntakeForm.addEventListener("submit", submitTaxIntake);
}
