"""
Base Abstract Adapter Interface for EcoGrid-Twin Data Collection.
All physical (Modbus RTU, Modbus TCP, MQTT) and simulation adapters inherit from this class.
STRICTLY READ-ONLY: No control or write methods are exposed.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from datetime import datetime

class BaseAdapter(ABC):
    def __init__(self, name: str):
        self.name = name
        self.last_read_time: Optional[datetime] = None
        self.is_active: bool = False
        self.last_error: Optional[str] = None
        self.connection_status: str = "DISCONNECTED" # CONNECTED | DISCONNECTED | ERROR

    @abstractmethod
    def connect(self) -> bool:
        """Initialize connection to device or service. Returns True if successful."""
        pass

    @abstractmethod
    def disconnect(self):
        """Safely close any open serial ports, TCP sockets, or MQTT clients."""
        pass

    @abstractmethod
    def read_telemetry(self) -> Optional[Dict[str, Any]]:
        """
        Poll or retrieve the latest read-only telemetry point.
        Returns a structured dictionary or None if read failed.
        """
        pass

    def get_status(self) -> Dict[str, Any]:
        """Return diagnostic status of the adapter."""
        return {
            "adapter_name": self.name,
            "is_active": self.is_active,
            "connection_status": self.connection_status,
            "last_read_time": self.last_read_time.isoformat() if self.last_read_time else None,
            "last_error": self.last_error
        }
