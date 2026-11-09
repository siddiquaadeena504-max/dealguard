import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

// Lets phones on the same Wi-Fi open the dev server by the laptop's IP address.
const lanAddresses = Object.values(networkInterfaces())
  .flat()
  .filter((i) => i && i.family === "IPv4" && !i.internal)
  .map((i) => i!.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: lanAddresses,
  devIndicators: false,
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
