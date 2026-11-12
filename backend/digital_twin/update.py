"""
Background loop running real-time Digital Twin synchronization and state updating.
"""

import asyncio
from typing import Set
from fastapi import WebSocket
from backend.digital_twin.twin import DigitalTwin
from backend.utils.logger import logger

active_websockets: Set[WebSocket] = set()

async def broadcast_state(state: dict):
    """Send live telemetry to all connected WebSocket dashboards."""
    disconnected = set()
    for ws in list(active_websockets):
        try:
            await ws.send_json(state)
        except Exception:
            disconnected.add(ws)
    for ws in disconnected:
        active_websockets.discard(ws)

async def simulation_ticker_loop():
    """
    Continuous background loop stepping the digital twin.
    """
    twin = DigitalTwin.get_instance()
    logger.info("Starting EcoGrid-Twin background simulation ticker loop.")

    while True:
        try:
            delay = 1.0 / max(0.2, twin.simulation_speed)
            await asyncio.sleep(delay)
            if not twin.is_paused:
                state = twin.tick()
                if active_websockets:
                    await broadcast_state(state)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in simulation ticker loop: {e}")
            await asyncio.sleep(1.0)
