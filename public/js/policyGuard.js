(function () {
  async function enforceCurrentPolicies() {
    const storedUser =
      localStorage.getItem(
        "megaFinancialUser"
      );

    const token =
      localStorage.getItem(
        "megaFinancialToken"
      );

    if (
      !storedUser ||
      !token
    ) {
      return;
    }

    let user;

    try {
      user =
        JSON.parse(
          storedUser
        );
    } catch (error) {
      return;
    }

    if (
      user.role !== "client"
    ) {
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

      if (
        response.status === 401
      ) {
        localStorage.removeItem(
          "megaFinancialToken"
        );

        localStorage.removeItem(
          "megaFinancialUser"
        );

        window.location.href =
          "./login.html";

        return;
      }

      if (!response.ok) {
        return;
      }

      const data =
        await response.json();

      if (
        !data
          .allCurrentPoliciesAcknowledged
      ) {
        window.location.replace(
          "./policy-acknowledgement.html"
        );
      }
    } catch (error) {
      console.error(
        "Policy acknowledgement status check failed."
      );
    }
  }

  enforceCurrentPolicies();
})();
