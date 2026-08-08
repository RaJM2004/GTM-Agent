"""
Audit Logger Middleware
Intercepts all write operations (POST, PUT, PATCH, DELETE) and records
an audit log entry in MongoDB so every state-changing action is traceable.
"""

import logging
from datetime import datetime, timezone
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)

# Paths to skip (health check, static files, webhooks)
SKIP_PATHS = [
    "/",
    "/health",
    "/static",
    "/vapi-webhook",
    "/api/v1/auth/refresh",  # token refresh is not an auditable write
]

AUDITED_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


class AuditLoggerMiddleware(BaseHTTPMiddleware):
    """
    Middleware that logs write operations to the `audit_logs` MongoDB collection.
    It reads the JWT from the cookie or Authorization header to identify the user.
    This runs *after* the response is sent to avoid adding latency.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # Only log write operations
        if request.method not in AUDITED_METHODS:
            return response

        # Skip internal/non-auditable paths
        path = request.url.path
        if any(path.startswith(skip) for skip in SKIP_PATHS):
            return response

        # Fire-and-forget: do NOT await so it doesn't slow down the response
        import asyncio
        asyncio.create_task(self._log_audit(request, response.status_code))

        return response

    async def _log_audit(self, request: Request, status_code: int):
        """Writes an audit log record asynchronously."""
        try:
            import database
            if database.db is None:
                return

            # Attempt to extract user_id from JWT (cookie or header)
            user_id = "anonymous"
            try:
                import jwt
                from config import settings
                token = None
                auth_header = request.headers.get("Authorization")
                if auth_header and auth_header.startswith("Bearer "):
                    token = auth_header.split(" ")[1]
                else:
                    token = request.cookies.get("access_token")

                if token:
                    payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
                    user_id = payload.get("user_id", "anonymous")
            except Exception:
                pass  # Token expired or missing — still log the action

            log_entry = {
                "user_id": user_id,
                "method": request.method,
                "path": request.url.path,
                "action": f"{request.method} {request.url.path}",
                "ip_address": request.client.host if request.client else "unknown",
                "status_code": status_code,
                "timestamp": datetime.now(timezone.utc),
            }

            await database.db.audit_logs.insert_one(log_entry)

        except Exception as e:
            logger.error(f"Audit log write failed: {e}")
