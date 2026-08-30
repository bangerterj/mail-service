process.env.APPS = JSON.stringify({
  key_live_testalpha000000000000000000000000: {
    appId: "alpha",
    from: "noreply@alpha.test",
    fromName: "Alpha App",
    replyTo: "support@alpha.test",
    templates: ["welcome", "password-reset", "mention", "activity-digest"],
  },
  key_live_testbeta0000000000000000000000000: {
    appId: "beta",
    from: "noreply@beta.test",
    fromName: "Beta App",
    templates: ["verify-email"],
    configurationSet: "beta",
  },
});
process.env.EMAIL_PROVIDER = "console";
process.env.AWS_REGION = "us-east-1";

export const ALPHA_KEY = "key_live_testalpha000000000000000000000000";
export const BETA_KEY = "key_live_testbeta0000000000000000000000000";
