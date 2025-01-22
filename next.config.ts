/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["sharp", "onnxruntime-node"],
  },
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
}

module.exports = nextConfig
