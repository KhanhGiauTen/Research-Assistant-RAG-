/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "pdfjs-dist/build/pdf.mjs": "pdfjs-dist/legacy/build/pdf.mjs",
    };
    return config;
  },
};

export default nextConfig;
