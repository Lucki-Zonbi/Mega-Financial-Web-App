const paymentServiceSelect =
  document.getElementById(
    "paymentService"
  );

const paymentCheckoutForm =
  document.getElementById(
    "paymentCheckoutForm"
  );

const paymentMessage =
  document.getElementById(
    "paymentMessage"
  );

const paymentHistoryList =
  document.getElementById(
    "paymentHistoryList"
  );

function getPaymentToken() {
  if (
    window
      .megaFinancialClientGuard
  ) {
    return window
      .megaFinancialClientGuard
      .getStoredToken();
  }

  return localStorage.getItem(
    "megaFinancialToken"
  );
}

function clearPaymentSession() {
  if (
    window
      .megaFinancialClientGuard
  ) {
    window
      .megaFinancialClientGuard
      .clearClientSession();
  } else {
    localStorage.removeItem(
      "megaFinancialToken"
    );

    localStorage.removeItem(
      "megaFinancialUser"
    );
  }
}

function showPaymentMessage(
  message,
  type = "info"
) {
  if (!paymentMessage) {
    return;
  }

  paymentMessage.textContent =
    message;

  paymentMessage.className =
    `auth-message ${type}`;
}

async function parsePaymentJson(
  response
) {
  try {
    return await response.json();
  } catch (error) {
    return {};
  }
}

function handlePaymentUnauthorized(
  data
) {
  clearPaymentSession();

  showPaymentMessage(
    data.message ||
      "Your session expired. Please log in again.",
    "error"
  );

  setTimeout(() => {
    window.location.href =
      "./login.html";
  }, 1200);
}

function getPaymentStatusLabel(
  status
) {
  const labels = {
    pending:
      "Pending",

    paid:
      "Paid",

    failed:
      "Failed",

    expired:
      "Expired"
  };

  return labels[status] ||
    "Status unavailable";
}

function formatPaymentAmount(
  amountTotal,
  currency
) {
  if (
    !Number.isInteger(
      amountTotal
    ) ||
    !currency
  ) {
    return "Final amount confirmed by Stripe";
  }

  try {
    return new Intl.NumberFormat(
      "en-US",
      {
        style:
          "currency",

        currency:
          String(
            currency
          ).toUpperCase()
      }
    ).format(
      amountTotal / 100
    );
  } catch (error) {
    return (
      `${amountTotal / 100} ` +
      String(
        currency
      ).toUpperCase()
    );
  }
}

function formatPaymentDate(
  value
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month:
        "short",

      day:
        "numeric",

      year:
        "numeric",

      hour:
        "numeric",

      minute:
        "2-digit"
    }
  ).format(date);
}

function renderPaymentHistory(
  payments
) {
  if (!paymentHistoryList) {
    return;
  }

  paymentHistoryList.textContent =
    "";

  if (!payments.length) {
    const emptyCard =
      document.createElement(
        "article"
      );

    emptyCard.className =
      "future-card";

    const title =
      document.createElement(
        "h3"
      );

    title.textContent =
      "No payment history yet";

    const text =
      document.createElement(
        "p"
      );

    text.textContent =
      "Completed or pending Mega Financial checkout records will appear here.";

    emptyCard.appendChild(
      title
    );

    emptyCard.appendChild(
      text
    );

    paymentHistoryList
      .appendChild(
        emptyCard
      );

    return;
  }

  payments.forEach(
    (payment) => {
      const card =
        document.createElement(
          "article"
        );

      card.className =
        "future-card";

      const title =
        document.createElement(
          "h3"
        );

      title.textContent =
        payment.serviceName ||
        "Mega Financial Service";

      const amount =
        document.createElement(
          "p"
        );

      amount.textContent =
        formatPaymentAmount(
          payment.amountTotal,
          payment.currency
        );

      const status =
        document.createElement(
          "span"
        );

      status.className =
        "dashboard-note";

      status.textContent =
        `Status: ${
          getPaymentStatusLabel(
            payment.status
          )
        }`;

      const date =
        document.createElement(
          "p"
        );

      date.textContent =
        `Created: ${
          formatPaymentDate(
            payment.createdAt
          )
        }`;

      card.appendChild(
        title
      );

      card.appendChild(
        amount
      );

      card.appendChild(
        status
      );

      card.appendChild(
        date
      );

      paymentHistoryList
        .appendChild(
          card
        );
    }
  );
}

async function loadPaymentServices() {
  if (!paymentServiceSelect) {
    return;
  }

  const token =
    getPaymentToken();

  if (!token) {
    return;
  }

  try {
    const response =
      await fetch(
        "/api/payments/services",
        {
          method:
            "GET",

          headers: {
            Authorization:
              `Bearer ${token}`
          }
        }
      );

    const data =
      await parsePaymentJson(
        response
      );

    if (
      response.status === 401
    ) {
      handlePaymentUnauthorized(
        data
      );

      return;
    }

    if (!response.ok) {
      showPaymentMessage(
        data.message ||
          "Payment services are temporarily unavailable.",
        "error"
      );

      return;
    }

    paymentServiceSelect
      .textContent = "";

    const placeholder =
      document.createElement(
        "option"
      );

    placeholder.value = "";

    placeholder.textContent =
      "Select a service";

    paymentServiceSelect
      .appendChild(
        placeholder
      );

    data.services.forEach(
      (service) => {
        const option =
          document.createElement(
            "option"
          );

        option.value =
          service.serviceKey;

        option.textContent =
          service.serviceName;

        paymentServiceSelect
          .appendChild(
            option
          );
      }
    );

    if (
      !data.services.length
    ) {
      paymentServiceSelect
        .disabled = true;

      showPaymentMessage(
        "Secure checkout is not configured for any services yet.",
        "info"
      );
    }
  } catch (error) {
    showPaymentMessage(
      "Unable to connect to the payment service.",
      "error"
    );
  }
}

async function loadPaymentHistory() {
  if (!paymentHistoryList) {
    return;
  }

  const token =
    getPaymentToken();

  if (!token) {
    return;
  }

  try {
    const response =
      await fetch(
        "/api/payments/me?limit=10",
        {
          method:
            "GET",

          headers: {
            Authorization:
              `Bearer ${token}`
          }
        }
      );

    const data =
      await parsePaymentJson(
        response
      );

    if (
      response.status === 401
    ) {
      handlePaymentUnauthorized(
        data
      );

      return;
    }

    if (!response.ok) {
      renderPaymentHistory(
        []
      );

      return;
    }

    renderPaymentHistory(
      Array.isArray(
        data.payments
      )
        ? data.payments
        : []
    );
  } catch (error) {
    renderPaymentHistory(
      []
    );
  }
}

function handleCheckoutReturnMessage() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const checkout =
    params.get(
      "checkout"
    );

  if (!checkout) {
    return;
  }

  window.history
    .replaceState(
      {},
      document.title,
      "./payment.html"
    );

  if (
    checkout === "success"
  ) {
    showPaymentMessage(
      "Stripe Checkout returned successfully. Payment status updates only after server-side Stripe confirmation.",
      "success"
    );
  } else if (
    checkout === "cancelled"
  ) {
    showPaymentMessage(
      "Checkout was cancelled. No successful payment has been recorded from the browser return.",
      "info"
    );
  }
}

if (paymentCheckoutForm) {
  paymentCheckoutForm
    .addEventListener(
      "submit",
      async function (
        event
      ) {
        event.preventDefault();

        if (
          window
            .megaFinancialClientGuard
            ?.isAdminPreviewMode?.() ===
          true
        ) {
          showPaymentMessage(
            "Payment checkout is disabled during Executive Admin Preview Mode.",
            "info"
          );

          return;
        }

        const token =
          getPaymentToken();

        if (!token) {
          window.location.href =
            "./login.html";

          return;
        }

        const serviceKey =
          String(
            paymentServiceSelect
              ?.value ||
              ""
          ).trim();

        if (!serviceKey) {
          showPaymentMessage(
            "Please select a Mega Financial service.",
            "error"
          );

          return;
        }

        try {
          showPaymentMessage(
            "Preparing secure Stripe Checkout...",
            "info"
          );

          const response =
            await fetch(
              "/api/payments/checkout-session",
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",

                  Authorization:
                    `Bearer ${token}`
                },

                body:
                  JSON.stringify({
                    serviceKey
                  })
              }
            );

          const data =
            await parsePaymentJson(
              response
            );

          if (
            response.status ===
            401
          ) {
            handlePaymentUnauthorized(
              data
            );

            return;
          }

          if (!response.ok) {
            showPaymentMessage(
              data.message ||
                "Secure checkout could not be created.",
              "error"
            );

            return;
          }

          const checkoutUrl =
            new URL(
              data.checkoutUrl
            );

          if (
            checkoutUrl.protocol !==
              "https:" ||
            checkoutUrl.hostname !==
              "checkout.stripe.com"
          ) {
            throw new Error(
              "Unexpected checkout destination."
            );
          }

          window.location
            .assign(
              checkoutUrl.href
            );
        } catch (error) {
          showPaymentMessage(
            "Secure checkout is temporarily unavailable.",
            "error"
          );
        }
      }
    );
}

const isPaymentAdminPreview =
  window
    .megaFinancialClientGuard
    ?.isAdminPreviewMode?.() ===
  true;

handleCheckoutReturnMessage();

if (isPaymentAdminPreview) {
  if (paymentServiceSelect) {
    paymentServiceSelect
      .disabled = true;
  }

  const submitButton =
    paymentCheckoutForm
      ?.querySelector(
        'button[type="submit"]'
      );

  if (submitButton) {
    submitButton.disabled =
      true;
  }

  showPaymentMessage(
    "Executive Admin Preview Mode — real Stripe Checkout is disabled.",
    "info"
  );

  renderPaymentHistory(
    []
  );
} else {
  loadPaymentServices();
  loadPaymentHistory();
}
