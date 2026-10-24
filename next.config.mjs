/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained server output for the Docker image (Coolify). Vercel ignores it.
  output: "standalone",
  serverExternalPackages: ["@aws-sdk/client-sesv2", "@aws-sdk/client-sns"],
};

export default nextConfig;
