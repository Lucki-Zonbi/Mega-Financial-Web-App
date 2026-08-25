const nodemailer =
  require("nodemailer");

function getRequiredEmailConfig() {
  const config = {
    host:
      String(
        process.env.SMTP_HOST || ""
      ).trim(),

    port:
      Number(
        process.env.SMTP_PORT || 0
      ),

    secure:
      String(
        process.env.SMTP_SECURE ||
          "false"
      ) === "true",

    user:
      String(
        process.env.SMTP_USER || ""
      ).trim(),

    pass:
      String(
        process.env.SMTP_PASS || ""
      ),

    from:
      String(
        process.env.EMAIL_FROM || ""
      ).trim(),

    frontendOrigin:
      String(
        process.env.FRONTEND_ORIGIN ||
          ""
      )
        .trim()
        .replace(/\/$/, "")
  };

  if (
    !config.host ||
    !Number.isInteger(
      config.port
    ) ||
    config.port <= 0 ||
    !config.user ||
    !config.pass ||
    !config.from ||
    !config.frontendOrigin
  ) {
    throw new Error(
      "Account email delivery is not configured."
    );
  }

  return config;
}

function createTransport(
  config
) {
  return nodemailer.createTransport({
    host:
      config.host,

    port:
      config.port,

    secure:
      config.secure,

    auth: {
      user:
        config.user,

      pass:
        config.pass
    }
  });
}

async function sendEmailVerificationMessage({
  email,
  fullName,
  token
}) {
  const config =
    getRequiredEmailConfig();

  const transport =
    createTransport(
      config
    );

  const verificationUrl =
    `${config.frontendOrigin}` +
    `/verify-email.html?token=` +
    encodeURIComponent(
      token
    );

  await transport.sendMail({
    from:
      config.from,

    to:
      email,

    subject:
      "Verify your Mega Financial email",

    text: [
      `Hello ${fullName},`,
      "",
      "Verify your Mega Financial email address using this link:",
      verificationUrl,
      "",
      "This link expires in 24 hours. If you did not create this account, you can ignore this message."
    ].join("\n")
  });
}

async function sendPasswordResetMessage({
  email,
  fullName,
  token
}) {
  const config =
    getRequiredEmailConfig();

  const transport =
    createTransport(
      config
    );

  const resetUrl =
    `${config.frontendOrigin}` +
    `/reset-password.html?token=` +
    encodeURIComponent(
      token
    );

  await transport.sendMail({
    from:
      config.from,

    to:
      email,

    subject:
      "Reset your Mega Financial password",

    text: [
      `Hello ${fullName},`,
      "",
      "Reset your Mega Financial password using this link:",
      resetUrl,
      "",
      "This link expires in 30 minutes. If you did not request a password reset, you can ignore this message."
    ].join("\n")
  });
}

module.exports = {
  sendEmailVerificationMessage,
  sendPasswordResetMessage
};
