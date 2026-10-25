import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.1.74", "192.168.1.7", "172.20.10.2"],
};

export default nextConfig;
