import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // /api/edit-image が fs で読む背景参照画像を Vercel の関数バンドルに含める
  outputFileTracingIncludes: {
    "/api/edit-image": ["./public/backgrounds/**"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "rwppnptslrvcqpisloue.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "**",
      },
    ],
  },
};

export default nextConfig;
