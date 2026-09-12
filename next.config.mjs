/** @type {import('next').NextConfig} */
const nextConfig = {
  // A self-contained server in .next/standalone, so a container image needs
  // only that folder and the static assets rather than all of node_modules.
  //
  // Opt-in, set by the Dockerfile. Building standalone output with pnpm
  // creates symlinks, which Windows refuses without admin rights or Developer
  // Mode — enabling it unconditionally broke `pnpm build` on a Windows machine.
  ...(process.env.NEXT_OUTPUT === "standalone" ? { output: "standalone" } : {}),
  serverExternalPackages: ["@aws-sdk/client-sesv2", "@aws-sdk/client-sns"],
};

export default nextConfig;
