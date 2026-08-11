import http from "k6/http";
import { check, sleep } from "k6";

const api = __ENV.API_URL || "http://localhost:8000";
const frontend = __ENV.SITE_URL || "http://localhost:3002";

export const options = {
  stages: [
    { duration: "20s", target: 10 },
    { duration: "40s", target: 25 },
    { duration: "20s", target: 0 }
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    // Ambiente local não possui o cache da CDN da Vercel. Em preview/produção,
    // use P95_MS=1000 para aplicar a meta mais estrita sobre respostas cacheadas.
    http_req_duration: [`p(95)<${Number(__ENV.P95_MS || 2000)}`]
  }
};

export default function () {
  const responses = http.batch([
    ["GET", `${api}/municipios`],
    ["GET", `${api}/municipios/5003702/indicadores`],
    ["GET", `${api}/ranking/saneamento?ano=2023`],
    ["GET", frontend]
  ]);
  check(responses, { "todas as respostas são 200": (items) => items.every((item) => item.status === 200) });
  sleep(1);
}
