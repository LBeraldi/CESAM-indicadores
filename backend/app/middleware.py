from __future__ import annotations

import asyncio
from collections import defaultdict, deque
import json
import logging
import os
import time
from uuid import uuid4

from fastapi import Request
from starlette.responses import JSONResponse, Response


logger = logging.getLogger("observatorio.http")
_janelas: dict[str, deque[float]] = defaultdict(deque)
_rate_lock = asyncio.Lock()


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "").split(",", 1)[0].strip()
    return forwarded or (request.client.host if request.client else "desconhecido")


async def _rate_limited(request: Request) -> bool:
    limite = int(os.getenv("RATE_LIMIT_PER_MINUTE", "120"))
    if limite <= 0 or request.url.path == "/health":
        return False

    agora = time.monotonic()
    chave = _client_key(request)
    async with _rate_lock:
        janela = _janelas[chave]
        while janela and janela[0] <= agora - 60:
            janela.popleft()
        if len(janela) >= limite:
            return True
        janela.append(agora)

        if len(_janelas) > 10_000:
            inativas = [item for item, eventos in _janelas.items() if not eventos or eventos[-1] <= agora - 60]
            for item in inativas:
                _janelas.pop(item, None)
    return False


def _security_headers(response: Response, request: Request, request_id: str) -> None:
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if request.url.path in {"/docs", "/redoc"}:
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; "
            "script-src 'self' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "img-src 'self' data: https://fastapi.tiangolo.com"
        )
    else:
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"


def _cache_headers(response: Response, request: Request) -> None:
    if request.method != "GET" or response.status_code >= 400 or request.url.path == "/health":
        response.headers["Cache-Control"] = "no-store"
        return
    response.headers["Cache-Control"] = "public, max-age=60"
    response.headers["Vercel-CDN-Cache-Control"] = "public, s-maxage=3600, stale-while-revalidate=86400"


async def observability_middleware(request: Request, call_next) -> Response:
    inicio = time.perf_counter()
    request_id = request.headers.get("x-request-id", "")[:64] or str(uuid4())

    if await _rate_limited(request):
        response: Response = JSONResponse(
            status_code=429,
            content={"detail": "Limite temporário de requisições excedido. Tente novamente em instantes."},
            headers={"Retry-After": "60"},
        )
    else:
        response = await call_next(request)

    _security_headers(response, request, request_id)
    _cache_headers(response, request)
    logger.info(
        json.dumps(
            {
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "duration_ms": round((time.perf_counter() - inicio) * 1000, 2),
            },
            ensure_ascii=False,
        )
    )
    return response
