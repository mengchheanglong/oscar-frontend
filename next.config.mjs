/** @type {import("next").NextConfig} */
const nextConfig = {
  // Avoid standalone dependency links during local Windows build cleanup.
  output:
    process.env.NODE_ENV === "production" && process.platform !== "win32"
      ? "standalone"
      : undefined,
  async rewrites() {
    const backendUrl =
      process.env.BACKEND_INTERNAL_URL ||
      (process.env.NEXT_PUBLIC_API_URL?.startsWith("http")
        ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, "")
        : undefined) ||
      "http://127.0.0.1:3001";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};
export default nextConfig;

