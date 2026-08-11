const appointmentForm = document.getElementById(
  "appointmentForm"
);

const serviceType = document.getElementById(
  "serviceType"
);

const platformType = document.getElementById(
  "platformType"
);

const appointmentDate = document.getElementById(
  "appointmentDate"
);

const appointmentTime = document.getElementById(
  "appointmentTime"
);

const clientNotes = document.getElementById(
  "clientNotes"
);

const appointmentSubmitButton =
  document.getElementById(
    "appointmentSubmitButton"
  );

const appointmentMessage =
  document.getElementById(
    "appointmentMessage"
  );

const appointmentList =
  document.getElementById(
    "appointmentList"
  );

const appointmentListMessage =
  document.getElementById(
    "appointmentListMessage"
  );

const scheduleSummaryHeading =
  document.getElementById(
    "scheduleSummaryHeading"
  );

const scheduleSummaryService =
  document.getElementById(
    "scheduleSummaryService"
  );

const scheduleSummaryPlatform =
  document.getElementById(
    "scheduleSummaryPlatform"
  );

const scheduleSummaryDate =
  document.getElementById(
    "scheduleSummaryDate"
  );

const scheduleSummaryTime =
  document.getElementById(
    "scheduleSummaryTime"
  );

const CANCELLABLE_STATUSES = [
  "requested",
  "confirmed"
];

function getScheduleToken() {
  if (window.megaFinancialClientGuard) {
    return window
      .megaFinancialClientGuard
      .getStoredToken();
  }

  return localStorage.getItem(
    "megaFinancialToken"
  );
}

function clearScheduleSession() {
  if (window.megaFinancialClientGuard) {
    window
      .megaFinancialClientGuard
      .clearClientSession();

    return;
  }

  localStorage.removeItem(
    "megaFinancialToken"
  );

  localStorage.removeItem(
    "megaFinancialUser"
  );
}

function setAppointmentMessage(
  message,
  type = "info"
) {
  if (!appointmentMessage) {
    return;
  }

  appointmentMessage.textContent =
    message;

  appointmentMessage.className =
    `auth-message ${type}`;
}

function setAppointmentListMessage(
  message,
  type = "info"
) {
  if (!appointmentListMessage) {
    return;
  }

  appointmentListMessage.textContent =
    message;

  appointmentListMessage.className =
    `auth-message schedule-list-message ${type}`;
}

function formatStatus(status) {
  return String(status || "")
    .split("_")
    .map((word) => {
      return (
        word.charAt(0).toUpperCase() +
        word.slice(1)
      );
    })
    .join(" ");
}

function formatAppointmentDateTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }
  ).format(date);
}

function formatSummaryDate(value) {
  if (!value) {
    return "Not selected";
  }

  const [
    year,
    month,
    day
  ] = value
    .split("-")
    .map(Number);

  const date = new Date(
    year,
    month - 1,
    day
  );

  if (Number.isNaN(date.getTime())) {
    return "Not selected";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      weekday: "short",
      month: "long",
      day: "numeric",
      year: "numeric"
    }
  ).format(date);
}

function formatSummaryTime(value) {
  if (!value) {
    return "Not selected";
  }

  const [
    hourString,
    minuteString
  ] = value.split(":");

  const hour = Number(hourString);
  const minute = Number(minuteString);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute)
  ) {
    return "Not selected";
  }

  const date = new Date();

  date.setHours(
    hour,
    minute,
    0,
    0
  );

  return new Intl.DateTimeFormat(
    "en-US",
    {
      hour: "numeric",
      minute: "2-digit"
    }
  ).format(date);
}

function updateAppointmentSummary() {
  if (scheduleSummaryService) {
    scheduleSummaryService.textContent =
      serviceType?.value ||
      "Not selected";
  }

  if (scheduleSummaryPlatform) {
    scheduleSummaryPlatform.textContent =
      platformType?.value ||
      "Not selected";
  }

  if (scheduleSummaryDate) {
    scheduleSummaryDate.textContent =
      formatSummaryDate(
        appointmentDate?.value
      );
  }

  if (scheduleSummaryTime) {
    scheduleSummaryTime.textContent =
      formatSummaryTime(
        appointmentTime?.value
      );
  }
}

function getLocalDateInputValue(date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function setAppointmentDateLimits() {
  if (!appointmentDate) {
    return;
  }

  const minimumDate = new Date();

  minimumDate.setDate(
    minimumDate.getDate() + 1
  );

  const maximumDate = new Date();

  maximumDate.setDate(
    maximumDate.getDate() + 180
  );

  appointmentDate.min =
    getLocalDateInputValue(
      minimumDate
    );

  appointmentDate.max =
    getLocalDateInputValue(
      maximumDate
    );
}

function validateAppointmentForm() {
  const selectedService =
    serviceType?.value || "";

  const selectedPlatform =
    platformType?.value || "";

  const selectedDate =
    appointmentDate?.value || "";

  const selectedTime =
    appointmentTime?.value || "";

  const notes =
    clientNotes?.value.trim() || "";

  if (!selectedService) {
    return "Select a Mega Financial service.";
  }

  if (!selectedPlatform) {
    return "Select a consultation platform.";
  }

  if (!selectedDate) {
    return "Select an appointment date.";
  }

  if (!selectedTime) {
    return "Select an appointment time.";
  }

  if (notes.length > 1000) {
    return "Appointment notes cannot exceed 1,000 characters.";
  }

  const selectedStart = new Date(
    `${selectedDate}T${selectedTime}:00`
  );

  if (
    Number.isNaN(
      selectedStart.getTime()
    )
  ) {
    return "Select a valid appointment date and time.";
  }

  const minimumStart = new Date(
    Date.now() +
      24 * 60 * 60 * 1000
  );

  if (selectedStart < minimumStart) {
    return "Appointments must be requested at least 24 hours in advance.";
  }

  const dayOfWeek =
    selectedStart.getDay();

  if (
    dayOfWeek === 0 ||
    dayOfWeek === 6
  ) {
    return "Select a weekday appointment date.";
  }

  return null;
}

function createAppointmentDetail(
  label,
  value
) {
  const paragraph =
    document.createElement("p");

  const strong =
    document.createElement("strong");

  strong.textContent =
    `${label}: `;

  const text =
    document.createTextNode(
      value || "Not available"
    );

  paragraph.appendChild(strong);
  paragraph.appendChild(text);

  return paragraph;
}

async function cancelAppointment(
  appointmentId
) {
  const token = getScheduleToken();

  if (!token) {
    setAppointmentListMessage(
      "Your session is missing. Please log in again.",
      "error"
    );

    return;
  }

  const shouldCancel =
    window.confirm(
      "Are you sure you want to cancel this appointment?"
    );

  if (!shouldCancel) {
    return;
  }

  try {
    setAppointmentListMessage(
      "Cancelling the appointment..."
    );

    const response = await fetch(
      `/api/appointments/${
        encodeURIComponent(
          appointmentId
        )
      }/cancel`,
      {
        method: "PATCH",
        headers: {
          "Content-Type":
            "application/json",
          Authorization:
            `Bearer ${token}`
        },
        body: JSON.stringify({
          cancellationReason: ""
        })
      }
    );

    const data =
      await response.json();

    if (response.status === 401) {
      clearScheduleSession();

      setAppointmentListMessage(
        data.message ||
          "Your session expired. Please log in again.",
        "error"
      );

      setTimeout(() => {
        window.location.href =
          "./login.html";
      }, 1200);

      return;
    }

    if (response.status === 403) {
      setAppointmentListMessage(
        data.message ||
          "Only authorized clients may cancel appointments.",
        "error"
      );

      return;
    }

    if (!response.ok) {
      setAppointmentListMessage(
        data.message ||
          "The appointment could not be cancelled.",
        "error"
      );

      return;
    }

    setAppointmentListMessage(
      data.message ||
        "The appointment was cancelled.",
      "success"
    );

    await loadAppointments();
  } catch (error) {
    setAppointmentListMessage(
      "Unable to connect to the appointment server.",
      "error"
    );
  }
}

function createAppointmentCard(
  appointment
) {
  const card =
    document.createElement("article");

  card.className =
    "future-card schedule-appointment-card";

  const heading =
    document.createElement("h3");

  heading.textContent =
    appointment.serviceType;

  const status =
    document.createElement("span");

  status.className =
    "dashboard-note schedule-status-badge";

  status.textContent =
    formatStatus(
      appointment.status
    );

  card.appendChild(heading);

  card.appendChild(
    createAppointmentDetail(
      "Date and time",
      formatAppointmentDateTime(
        appointment.appointmentStart
      )
    )
  );

  card.appendChild(
    createAppointmentDetail(
      "Platform",
      appointment.platformType
    )
  );

  card.appendChild(
    createAppointmentDetail(
      "Duration",
      `${appointment.durationMinutes} minutes`
    )
  );

  if (appointment.clientNotes) {
    card.appendChild(
      createAppointmentDetail(
        "Notes",
        appointment.clientNotes
      )
    );
  }

  if (
    appointment.cancellationReason
  ) {
    card.appendChild(
      createAppointmentDetail(
        "Cancellation reason",
        appointment.cancellationReason
      )
    );
  }

  card.appendChild(status);

  const appointmentStart =
    new Date(
      appointment.appointmentStart
    );

  const mayCancel =
    CANCELLABLE_STATUSES.includes(
      appointment.status
    ) &&
    appointmentStart > new Date();

  if (mayCancel) {
    const actionArea =
      document.createElement("div");

    actionArea.className =
      "schedule-appointment-actions";

    const cancelButton =
      document.createElement("button");

    cancelButton.type = "button";
    cancelButton.className =
      "btn secondary-btn";

    cancelButton.textContent =
      "Cancel Appointment";

    cancelButton.addEventListener(
      "click",
      function () {
        cancelAppointment(
          appointment.id
        );
      }
    );

    actionArea.appendChild(
      cancelButton
    );

    card.appendChild(
      actionArea
    );
  }

  return card;
}

function renderAppointments(
  appointments
) {
  if (!appointmentList) {
    return;
  }

  appointmentList.replaceChildren();

  if (
    !Array.isArray(appointments) ||
    appointments.length === 0
  ) {
    setAppointmentListMessage(
      "You do not have any appointment records yet."
    );

    return;
  }

  appointments.forEach(
    (appointment) => {
      appointmentList.appendChild(
        createAppointmentCard(
          appointment
        )
      );
    }
  );

  setAppointmentListMessage(
    `${appointments.length} appointment ${
      appointments.length === 1
        ? "record was"
        : "records were"
    } retrieved securely.`,
    "success"
  );
}

async function loadAppointments() {
  if (!appointmentList) {
    return;
  }

  const token = getScheduleToken();

  if (!token) {
    setAppointmentListMessage(
      "Please log in to view your appointments.",
      "error"
    );

    return;
  }

  try {
    const response = await fetch(
      "/api/appointments/me",
      {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${token}`
        }
      }
    );

    const data =
      await response.json();

    if (response.status === 401) {
      clearScheduleSession();

      setAppointmentListMessage(
        data.message ||
          "Your session expired. Please log in again.",
        "error"
      );

      setTimeout(() => {
        window.location.href =
          "./login.html";
      }, 1200);

      return;
    }

    if (response.status === 403) {
      setAppointmentListMessage(
        data.message ||
          "Only authorized clients may view appointments.",
        "error"
      );

      return;
    }

    if (!response.ok) {
      setAppointmentListMessage(
        data.message ||
          "Your appointments could not be retrieved.",
        "error"
      );

      return;
    }

    renderAppointments(
      data.appointments
    );
  } catch (error) {
    setAppointmentListMessage(
      "Unable to connect to the appointment server.",
      "error"
    );
  }
}

async function submitAppointment(
  event
) {
  event.preventDefault();

  const token = getScheduleToken();

  if (!token) {
    setAppointmentMessage(
      "Your client session is missing. Please log in again.",
      "error"
    );

    return;
  }

  const validationMessage =
    validateAppointmentForm();

  if (validationMessage) {
    setAppointmentMessage(
      validationMessage,
      "error"
    );

    return;
  }

  const originalButtonText =
    appointmentSubmitButton.textContent;

  try {
    appointmentSubmitButton.disabled =
      true;

    appointmentSubmitButton.textContent =
      "Submitting Request...";

    setAppointmentMessage(
      "Submitting your protected appointment request..."
    );

    const response = await fetch(
      "/api/appointments",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Authorization:
            `Bearer ${token}`
        },
        body: JSON.stringify({
          serviceType:
            serviceType.value,
          platformType:
            platformType.value,
          appointmentDate:
            appointmentDate.value,
          appointmentTime:
            appointmentTime.value,
          clientNotes:
            clientNotes.value.trim()
        })
      }
    );

    const data =
      await response.json();

    if (response.status === 401) {
      clearScheduleSession();

      setAppointmentMessage(
        data.message ||
          "Your session expired. Please log in again.",
        "error"
      );

      setTimeout(() => {
        window.location.href =
          "./login.html";
      }, 1200);

      return;
    }

    if (response.status === 403) {
      setAppointmentMessage(
        data.message ||
          "Only authorized clients may request appointments.",
        "error"
      );

      return;
    }

    if (!response.ok) {
      setAppointmentMessage(
        data.message ||
          "The appointment request could not be submitted.",
        "error"
      );

      return;
    }

    setAppointmentMessage(
      data.message ||
        "Your appointment request was submitted.",
      "success"
    );

    if (scheduleSummaryHeading) {
      scheduleSummaryHeading.textContent =
        "Request Submitted";
    }

    appointmentForm.reset();

    updateAppointmentSummary();

    await loadAppointments();
  } catch (error) {
    setAppointmentMessage(
      "Unable to connect to the appointment server.",
      "error"
    );
  } finally {
    appointmentSubmitButton.disabled =
      false;

    appointmentSubmitButton.textContent =
      originalButtonText;
  }
}

[
  serviceType,
  platformType,
  appointmentDate,
  appointmentTime
].forEach((control) => {
  control?.addEventListener(
    "change",
    updateAppointmentSummary
  );
});

if (appointmentForm) {
  appointmentForm.addEventListener(
    "submit",
    submitAppointment
  );
}

setAppointmentDateLimits();
updateAppointmentSummary();
loadAppointments();
