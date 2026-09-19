const POLICY_VERSIONS = Object.freeze({
  privacy_policy: {
    version: "2026-09-16",
    title: "Mega Financial Privacy Policy"
  },

  cookie_data_notice: {
    version: "2026-09-16",
    title:
      "Mega Financial Cookie & Data Collection Notice"
  }
});

const POLICY_TYPES = Object.freeze(
  Object.keys(POLICY_VERSIONS)
);

module.exports = {
  POLICY_VERSIONS,
  POLICY_TYPES
};
