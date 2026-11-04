import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure heavy server-side libraries are never bundled into client bundles
  serverExternalPackages: [
    "pdf-parse",
    "tesseract.js",
    "exceljs",
    "@react-pdf/renderer",
    "openai",
  ],
};

export default nextConfig;
