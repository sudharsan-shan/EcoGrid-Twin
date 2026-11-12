"""
Helper and utility functions for Tamil Nadu pricing lookups, IST timezone handling, and clamping.
"""

from datetime import datetime
from zoneinfo import ZoneInfo
from backend.config import Config

IST_TZ = ZoneInfo(Config.TIMEZONE)

def get_now_ist() -> datetime:
    """Return current timestamp in Indian Standard Time (IST)."""
    return datetime.now(IST_TZ)

def format_ist_iso(dt: datetime = None) -> str:
    """Format datetime in ISO format with IST timezone."""
    d = dt or get_now_ist()
    if d.tzinfo is None:
        d = d.replace(tzinfo=IST_TZ)
    return d.isoformat()

def get_tnpdcl_tou_price(dt: datetime) -> float:
    """
    Return TNPDCL Time-of-Use price in ₹/kWh based on hour of day in IST:
    - Morning Peak: 06:00 - 09:00 (Peak rate)
    - Evening Peak: 18:00 - 21:00 (Peak rate)
    - Off-Peak Night: 22:00 - 05:00 (Off-peak rate)
    - Standard Day: Remaining hours (Standard rate)
    """
    hour = dt.hour
    if (6 <= hour < 9) or (18 <= hour < 21):
        return Config.GRID_PEAK_PRICE
    elif (hour >= 22) or (hour < 5):
        return Config.GRID_OFFPEAK_PRICE
    else:
        return Config.GRID_STANDARD_PRICE

# Backward compatibility alias
get_tou_price = get_tnpdcl_tou_price

def clamp(val: float, min_val: float, max_val: float) -> float:
    return max(min_val, min(max_val, val))
