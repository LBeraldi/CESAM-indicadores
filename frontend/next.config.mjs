const apiOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").origin;
  } catch {
    return "http://localhost:8000";
  }
})();

const developmentScriptPolicy = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${developmentScriptPolicy}`,
  `connect-src 'self' ${apiOrigin}`
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-Frame-Options", value: "DENY" }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // "standalone" é exigido pelo Dockerfile de self-host (copia .next/standalone
  // e roda `node server.js`). Na Vercel esse modo não é necessário — a
  // plataforma já empacota as funções serverless por conta própria — e no
  // Next.js 16 ele quebra o passo de tracing do build da Vercel (ENOENT em
  // next-server.js.nft.json). A Vercel expõe VERCEL=1 durante o build.
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  }
};

export default nextConfig;
