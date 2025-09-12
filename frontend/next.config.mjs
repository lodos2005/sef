/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  allowedDevOrigins: ["*", "liman.io", "*.liman.io"],
  devIndicators: false,
  rewrites: async () => {
    return [
      {
        source: "/api/:path*",
        destination: `http://localhost:8110/api/:path*`,
      },
    ]
  }
}

export default nextConfig
