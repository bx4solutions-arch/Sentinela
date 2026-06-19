import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fixa a raiz do workspace (há lockfiles em diretórios-pai). Evita o aviso de root.
  turbopack: { root: __dirname },
};

export default nextConfig;
