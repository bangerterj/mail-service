/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@aws-sdk/client-sesv2", "@aws-sdk/client-sns"],
};

export default nextConfig;
