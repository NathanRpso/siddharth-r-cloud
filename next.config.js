/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static export for GitLab Pages. Deploys via .gitlab-ci.yml to the
  // project's unique-domain Pages site — so basePath stays '/'.
  output: 'export',
  // GitLab Pages serves cleanest with trailing-slash URLs (folder/index.html).
  trailingSlash: true,
  // next/image isn't used, but the optimizer would still run unless
  // we opt out — keeps the export hermetic.
  images: { unoptimized: true },
};

module.exports = nextConfig;
