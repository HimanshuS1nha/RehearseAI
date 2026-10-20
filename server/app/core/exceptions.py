import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from psycopg.errors import UniqueViolation
from sqlalchemy.exc import IntegrityError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)

REQUEST_LOCATIONS = {"body", "query", "path", "header", "cookie"}


def error_response(status_code: int, message: str, **extra):
    return JSONResponse(status_code=status_code, content={"message": message, **extra})


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    log = logger.error if exc.status_code >= 500 else logger.warning
    log("%s %s -> %s: %s", request.method, request.url.path, exc.status_code, exc.detail)
    response = error_response(exc.status_code, str(exc.detail))
    # Keep headers the route set on the exception, e.g. WWW-Authenticate.
    if exc.headers:
        response.headers.update(exc.headers)
    return response


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Pydantic's errors include the submitted value under "input", which can be
    # a password, so only the type, location and message are logged.
    logger.warning(
        "%s %s -> 422: %s",
        request.method,
        request.url.path,
        [(e["type"], e["loc"], e["msg"]) for e in exc.errors()],
    )
    errors = []
    for error in exc.errors():
        loc = list(error["loc"])
        # Drop the leading "body"/"query"/... so the frontend gets plain field
        # names like "confirm_password"; a body-level error has no field.
        if loc and loc[0] in REQUEST_LOCATIONS:
            loc = loc[1:]
        # Malformed JSON reports a character position, not a field.
        if error["type"] == "json_invalid":
            loc = []
        errors.append(
            {
                "field": ".".join(str(part) for part in loc) or None,
                "message": error["msg"].removeprefix("Value error, "),
            }
        )
    return error_response(
        status.HTTP_422_UNPROCESSABLE_CONTENT, "Validation failed", errors=errors
    )


async def integrity_error_handler(request: Request, exc: IntegrityError):
    # Usually a race the route's own checks couldn't see, e.g. two
    # registrations with the same email arriving together.
    logger.warning(
        "%s %s -> 409: %s", request.method, request.url.path, exc.orig
    )
    message = (
        "Resource already exists"
        if isinstance(exc.orig, UniqueViolation)
        else "Request conflicts with existing data"
    )
    return error_response(status.HTTP_409_CONFLICT, message)


async def catch_unhandled_exceptions(request: Request, call_next):
    # A middleware rather than an exception handler: Starlette runs a handler
    # for plain Exception outside every other middleware, so its 500 would go
    # out without CORS headers and the browser would report a CORS error
    # instead. This must be added before CORSMiddleware so CORS wraps it.
    try:
        return await call_next(request)
    except Exception:
        logger.exception("%s %s -> 500: unhandled error", request.method, request.url.path)
        return error_response(
            status.HTTP_500_INTERNAL_SERVER_ERROR, "Internal server error"
        )


def register_exception_handlers(app: FastAPI):
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(IntegrityError, integrity_error_handler)
    app.middleware("http")(catch_unhandled_exceptions)
