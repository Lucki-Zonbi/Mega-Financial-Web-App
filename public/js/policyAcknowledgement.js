const policyForm =
  document.getElementById(
    "policyAcknowledgementForm"
  );

const privacyCheckbox =
  document.getElementById(
    "privacyPolicyAcknowledgement"
  );

const cookieCheckbox =
  document.getElementById(
    "cookieNoticeAcknowledgement"
  );

const privacyStatus =
  document.getElementById(
    "privacyPolicyStatus"
  );

const cookieStatus =
  document.getElementById(
    "cookieNoticeStatus"
  );

const acknowledgementStatus =
  document.getElementById(
    "policyAcknowledgementStatus"
  );

const acknowledgementSubmit =
  document.getElementById(
    "policyAcknowledgementSubmit"
  );

function getPolicyToken() {
  if (
    window.megaFinancialClientGuard
  ) {
    return window
      .megaFinancialClientGuard
      .getStoredToken();
  }

  return localStorage.getItem(
    "megaFinancialToken"
  );
}

function showPolicyMessage(
  message,
  type = ""
) {
  if (!acknowledgementStatus) {
    return;
  }

  acknowledgementStatus.textContent =
    message;

  acknowledgementStatus.className =
    "auth-message";

  if (type) {
    acknowledgementStatus
      .classList.add(type);
  }

  acknowledgementStatus.hidden =
    !message;
}

function applyPolicyStatus(data) {
  const policies =
    Array.isArray(data.policies)
      ? data.policies
      : [];

  policies.forEach(
    (policy) => {
      if (
        policy.policyType ===
        "privacy_policy"
      ) {
        privacyCheckbox.checked =
          policy.acknowledged;

        privacyCheckbox.disabled =
          policy.acknowledged;

        privacyStatus.textContent =
          policy.acknowledged
            ? `Acknowledged — version ${policy.version}`
            : `Current version: ${policy.version}`;
      }

      if (
        policy.policyType ===
        "cookie_data_notice"
      ) {
        cookieCheckbox.checked =
          policy.acknowledged;

        cookieCheckbox.disabled =
          policy.acknowledged;

        cookieStatus.textContent =
          policy.acknowledged
            ? `Acknowledged — version ${policy.version}`
            : `Current version: ${policy.version}`;
      }
    }
  );

  if (
    data.allCurrentPoliciesAcknowledged
  ) {
    acknowledgementSubmit.disabled =
      true;

    acknowledgementSubmit.textContent =
      "Current Policies Acknowledged";

    showPolicyMessage(
      "Your current Mega Financial policy acknowledgements are on record. Redirecting to your dashboard...",
      "success"
    );

    setTimeout(() => {
      window.location.href =
        "./dashboard.html";
    }, 1200);
  }
}

async function loadPolicyStatus() {
  const token =
    getPolicyToken();

  if (!token) {
    window.location.href =
      "./login.html";

    return;
  }

  try {
    const response =
      await fetch(
        "/api/policies/current",
        {
          headers: {
            Authorization:
              `Bearer ${token}`
          }
        }
      );

    const data =
      await response.json();

    if (response.status === 401) {
      window.location.href =
        "./login.html";

      return;
    }

    if (!response.ok) {
      throw new Error(
        data.message ||
          "Unable to load policy status."
      );
    }

    applyPolicyStatus(data);
  } catch (error) {
    showPolicyMessage(
      error.message,
      "error"
    );
  }
}

if (policyForm) {
  policyForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const policyTypes = [];

      if (
        !privacyCheckbox.disabled &&
        privacyCheckbox.checked
      ) {
        policyTypes.push(
          "privacy_policy"
        );
      }

      if (
        !cookieCheckbox.disabled &&
        cookieCheckbox.checked
      ) {
        policyTypes.push(
          "cookie_data_notice"
        );
      }

      if (
        policyTypes.length === 0
      ) {
        showPolicyMessage(
          "Please review and acknowledge each current policy before continuing.",
          "error"
        );

        return;
      }

      acknowledgementSubmit.disabled =
        true;

      try {
        const token =
          getPolicyToken();

        const response =
          await fetch(
            "/api/policies/acknowledge",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`
              },

              body:
                JSON.stringify({
                  policyTypes
                })
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to record acknowledgement."
          );
        }

        applyPolicyStatus(data);

        showPolicyMessage(
          "Your policy acknowledgement has been securely recorded.",
          "success"
        );

        setTimeout(() => {
          window.location.href =
            "./dashboard.html";
        }, 1200);
      } catch (error) {
        acknowledgementSubmit.disabled =
          false;

        showPolicyMessage(
          error.message,
          "error"
        );
      }
    }
  );
}

loadPolicyStatus();
