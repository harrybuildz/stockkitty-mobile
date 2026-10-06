// Dynamic wrapper over app.json: the Android Firebase config file is
// gitignored (public repo), so local prebuilds read ./google-services.json
// while EAS builds get a path via the GOOGLE_SERVICES_JSON file env var.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
});
