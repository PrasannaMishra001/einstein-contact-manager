from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import init_db
from app.api import auth, contacts, ai, import_export, analytics, sharing, reminders, webhooks, sse, google


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()  # create_all is idempotent — safe in dev and production
    yield


app = FastAPI(
    title="Einstein Contact Manager API",
    description="Smart Contact Management with AI — REST API",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── Middleware ─────────────────────────────────────────────────────────────────
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
prefix = "/api"
app.include_router(auth.router, prefix=prefix)
app.include_router(contacts.router, prefix=prefix)
app.include_router(ai.router, prefix=prefix)
app.include_router(import_export.router, prefix=prefix)
app.include_router(analytics.router, prefix=prefix)
app.include_router(sharing.router, prefix=prefix)
app.include_router(reminders.router, prefix=prefix)
app.include_router(webhooks.router, prefix=prefix)
app.include_router(sse.router, prefix=prefix)
app.include_router(google.router, prefix=prefix)


@app.get("/")
async def root():
    return {"name": settings.APP_NAME, "version": "2.0.0", "status": "ok"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
