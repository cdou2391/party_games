import time
from collections import defaultdict

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

# (max_requests, window_seconds) per path
_PATH_LIMITS: dict[str, tuple[int, int]] = {
    "/api/auth/login":    (5,  60),    # 5 attempts / minute
    "/api/auth/register": (10, 3600),  # 10 registrations / hour
    "/api/auth/guest":    (10, 3600),  # 10 guest accounts / hour
    "/api/auth/upgrade":  (10, 3600),  # 10 upgrades / hour
}
_DEFAULT_LIMIT: tuple[int, int] = (120, 60)  # 120 requests / minute for everything else

# Sliding-window store: (client_ip, path) → list of hit timestamps
# Safe without locks: asyncio is single-threaded and this critical section has no awaits.
_windows: dict[tuple[str, str], list[float]] = defaultdict(list)


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Never rate-limit CORS preflight
        if request.method == "OPTIONS":
            return await call_next(request)

        ip = request.client.host if request.client else "unknown"
        path = request.url.path
        max_req, window = _PATH_LIMITS.get(path, _DEFAULT_LIMIT)

        now = time.monotonic()
        key = (ip, path)

        hits = _windows[key]
        # Evict timestamps outside the current window
        _windows[key] = [t for t in hits if now - t < window]

        if len(_windows[key]) >= max_req:
            return JSONResponse(
                {"detail": "Too many requests"},
                status_code=429,
                headers={"Retry-After": str(window)},
            )

        _windows[key].append(now)
        return await call_next(request)
