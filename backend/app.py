"""
EcoGrid-Twin Backend Server Entry Point (Tamil Nadu Telemetry Edition).
Initializes FastAPI, registers CORS, mounts WebSocket & REST routes, and starts the TelemetryCollector loop.
"""

import asyncio
from contextlib import asynccontextmanager
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from backend.config import Config
from backend.database.database import init_db
from backend.adapters.collector import telemetry_collection_loop, active_telemetry_websockets, TelemetryCollector
from backend.api.routes import router as api_router
from backend.api import controllers
from backend.utils.logger import logger

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database and background telemetry loop
    logger.info("Initializing EcoGrid-Twin database...")
    init_db()
    
    logger.info("Starting background Telemetry Collector task...")
    telemetry_task = asyncio.create_task(telemetry_collection_loop())
    
    yield
    
    # Shutdown
    logger.info("Stopping background telemetry collection task...")
    telemetry_task.cancel()
    try:
        await telemetry_task
    except asyncio.CancelledError:
        pass

def create_app() -> FastAPI:
    """Application factory for EcoGrid-Twin FastAPI service."""
    app = FastAPI(
        title="EcoGrid-Twin API (Tamil Nadu Edition)",
        description="Production-Grade Real-Time Telemetry & Microgrid Digital Twin Platform for Tamil Nadu, India",
        version="2.0.0",
        lifespan=lifespan
    )

    # Enable CORS for Vue dashboard
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register API Router at /api
    app.include_router(api_router, prefix="/api")

    # Direct top-level WebSocket handlers
    @app.websocket("/ws/telemetry")
    @app.websocket("/ws/live")
    async def direct_ws_handler(websocket: WebSocket):
        await websocket.accept()
        active_telemetry_websockets.add(websocket)
        logger.info(f"WebSocket client connected to live stream. Active: {len(active_telemetry_websockets)}")
        try:
            initial = controllers.get_current_state()
            await websocket.send_json(initial)
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            active_telemetry_websockets.discard(websocket)
            logger.info(f"WebSocket client disconnected. Active: {len(active_telemetry_websockets)}")
        except Exception as e:
            active_telemetry_websockets.discard(websocket)
            logger.error(f"WebSocket direct error: {e}")

    @app.get("/")
    def root():
        return {
            "app": "EcoGrid-Twin Backend (Tamil Nadu Edition)",
            "site": Config.SITE_NAME,
            "city": Config.TAMILNADU_CITY,
            "status": "ONLINE",
            "timezone": Config.TIMEZONE,
            "telemetry_source": Config.TELEMETRY_SOURCE,
            "docs_url": "/docs"
        }

    return app

app = create_app()

if __name__ == "__main__":
    uvicorn.run(
        "backend.app:app",
        host=Config.HOST,
        port=Config.PORT,
        reload=Config.DEBUG,
        log_level="info"
    )
