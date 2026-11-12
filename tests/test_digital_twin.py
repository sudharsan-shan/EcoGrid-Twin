"""
Tests for backend/digital_twin module.
"""

def test_twin_state_initializes():
    from backend.digital_twin.state import TwinState
    state = TwinState()
    assert state.battery_soc == 0.0
