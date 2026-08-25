const accountSecurityMessage =
  document.getElementById(
    "accountSecurityMessage"
  );

const resendVerificationForm =
  document.getElementById(
    "resendVerificationForm"
  );

const forgotPasswordForm =
  document.getElementById(
    "forgotPasswordForm"
  );

const resetPasswordForm =
  document.getElementById(
    "resetPasswordForm"
  );

function showAccountSecurityMessage(
  message,
  type = "info"
) {
  if (!accountSecurityMessage) {
    return;
  }

  accountSecurityMessage.textContent =
    message;

  accountSecurityMessage.className =
    `auth-message ${type}`;
}

async function parseJsonResponse(
  response
) {
  try {
    return await response.json();
  } catch (error) {
    return {};
  }
}

async function verifyEmailFromUrl() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const token =
    String(
      params.get("token") || ""
    ).trim();

  if (!token) {
    return;
  }

  window.history.replaceState(
    {},
    document.title,
    "./verify-email.html"
  );

  try {
    showAccountSecurityMessage(
      "Verifying your email address...",
      "info"
    );

    const response =
      await fetch(
        "/api/auth/verify-email",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              token
            })
        }
      );

    const data =
      await parseJsonResponse(
        response
      );

    if (!response.ok) {
      showAccountSecurityMessage(
        data.message ||
          "The email verification link is invalid or expired.",
        "error"
      );

      return;
    }

    showAccountSecurityMessage(
      data.message ||
        "Email address verified successfully.",
      "success"
    );
  } catch (error) {
    showAccountSecurityMessage(
      "Unable to reach the verification service. Please try again.",
      "error"
    );
  }
}

if (resendVerificationForm) {
  resendVerificationForm
    .addEventListener(
      "submit",
      async function (event) {
        event.preventDefault();

        const formData =
          new FormData(
            resendVerificationForm
          );

        const email =
          formData.get(
            "email"
          );

        try {
          showAccountSecurityMessage(
            "Requesting a verification email...",
            "info"
          );

          const response =
            await fetch(
              "/api/auth/request-email-verification",
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json"
                },

                body:
                  JSON.stringify({
                    email
                  })
              }
            );

          const data =
            await parseJsonResponse(
              response
            );

          if (!response.ok) {
            showAccountSecurityMessage(
              data.message ||
                "The verification request could not be processed.",
              "error"
            );

            return;
          }

          showAccountSecurityMessage(
            data.message ||
              "If an eligible account exists for that email, a verification message will be sent.",
            "success"
          );

          resendVerificationForm
            .reset();
        } catch (error) {
          showAccountSecurityMessage(
            "Unable to reach the verification service. Please try again.",
            "error"
          );
        }
      }
    );
}

if (forgotPasswordForm) {
  forgotPasswordForm
    .addEventListener(
      "submit",
      async function (event) {
        event.preventDefault();

        const formData =
          new FormData(
            forgotPasswordForm
          );

        const email =
          formData.get(
            "email"
          );

        try {
          showAccountSecurityMessage(
            "Requesting password reset instructions...",
            "info"
          );

          const response =
            await fetch(
              "/api/auth/forgot-password",
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json"
                },

                body:
                  JSON.stringify({
                    email
                  })
              }
            );

          const data =
            await parseJsonResponse(
              response
            );

          if (!response.ok) {
            showAccountSecurityMessage(
              data.message ||
                "The password reset request could not be processed.",
              "error"
            );

            return;
          }

          showAccountSecurityMessage(
            data.message ||
              "If an account exists for that email, password reset instructions will be sent.",
            "success"
          );

          forgotPasswordForm
            .reset();
        } catch (error) {
          showAccountSecurityMessage(
            "Unable to reach the password reset service. Please try again.",
            "error"
          );
        }
      }
    );
}

if (resetPasswordForm) {
  resetPasswordForm
    .addEventListener(
      "submit",
      async function (event) {
        event.preventDefault();

        const params =
          new URLSearchParams(
            window.location.search
          );

        const token =
          String(
            params.get(
              "token"
            ) || ""
          ).trim();

        const formData =
          new FormData(
            resetPasswordForm
          );

        const resetData = {
          token,

          password:
            formData.get(
              "password"
            ),

          confirmPassword:
            formData.get(
              "confirmPassword"
            )
        };

        if (!token) {
          showAccountSecurityMessage(
            "The password reset link is invalid or expired.",
            "error"
          );

          return;
        }

        try {
          showAccountSecurityMessage(
            "Updating your password...",
            "info"
          );

          const response =
            await fetch(
              "/api/auth/reset-password",
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json"
                },

                body:
                  JSON.stringify(
                    resetData
                  )
              }
            );

          const data =
            await parseJsonResponse(
              response
            );

          if (!response.ok) {
            showAccountSecurityMessage(
              data.message ||
                "The password could not be reset.",
              "error"
            );

            return;
          }

          window.history.replaceState(
            {},
            document.title,
            "./reset-password.html"
          );

          resetPasswordForm
            .reset();

          showAccountSecurityMessage(
            data.message ||
              "Password reset successfully. Please log in with your new password.",
            "success"
          );
        } catch (error) {
          showAccountSecurityMessage(
            "Unable to reach the password reset service. Please try again.",
            "error"
          );
        }
      }
    );
}

verifyEmailFromUrl();
