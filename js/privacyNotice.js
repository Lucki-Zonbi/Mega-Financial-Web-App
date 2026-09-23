(function () {
  const NOTICE_VERSION =
    "2026-09-16";

  const STORAGE_KEY =
    "megaFinancialCookieDataNotice";

  function noticeAlreadyAcknowledged() {
    return (
      localStorage.getItem(
        STORAGE_KEY
      ) === NOTICE_VERSION
    );
  }

  function acknowledgeNotice() {
    localStorage.setItem(
      STORAGE_KEY,
      NOTICE_VERSION
    );

    const notice =
      document.getElementById(
        "cookieDataNotice"
      );

    if (notice) {
      notice.remove();
    }
  }

  function createNotice() {
    if (
      noticeAlreadyAcknowledged() ||
      document.getElementById(
        "cookieDataNotice"
      )
    ) {
      return;
    }

    const notice =
      document.createElement("aside");

    notice.id =
      "cookieDataNotice";

    notice.className =
      "cookie-data-notice";

    notice.setAttribute(
      "aria-label",
      "Cookie and data collection notice"
    );

    const content =
      document.createElement("div");

    content.className =
      "cookie-data-notice-content";

    const textWrapper =
      document.createElement("div");

    const heading =
      document.createElement("h2");

    heading.textContent =
      "Cookie & Data Collection Notice";

    const description =
      document.createElement("p");

    description.textContent =
      "Mega Financial uses browser storage and technical data necessary to operate and secure the website and client portal. Third-party services may use cookies or similar technologies under their own policies.";

    const policyLink =
      document.createElement("a");

    policyLink.href =
      "./cookie-data-notice.html";

    policyLink.textContent =
      "Read the Cookie & Data Collection Notice";

    const privacyLink =
      document.createElement("a");

    privacyLink.href =
      "./privacy-policy.html";

    privacyLink.textContent =
      "Privacy Policy";

    const links =
      document.createElement("div");

    links.className =
      "cookie-data-notice-links";

    links.appendChild(
      policyLink
    );

    links.appendChild(
      privacyLink
    );

    textWrapper.appendChild(
      heading
    );

    textWrapper.appendChild(
      description
    );

    textWrapper.appendChild(
      links
    );

    const button =
      document.createElement(
        "button"
      );

    button.type =
      "button";

    button.className =
      "btn primary-btn";

    button.textContent =
      "Acknowledge";

    button.addEventListener(
      "click",
      acknowledgeNotice
    );

    content.appendChild(
      textWrapper
    );

    content.appendChild(
      button
    );

    notice.appendChild(
      content
    );

    document.body.appendChild(
      notice
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      createNotice
    );
  } else {
    createNotice();
  }
})();
