# EcoGrid-Twin — Hardware Setup & Telemetry Integration Guide (Tamil Nadu Edition)

This guide provides step-by-step engineering instructions for safely interfacing **EcoGrid-Twin** with physical smart energy meters, solar inverters, and battery management systems (BMS) over **RS485 Modbus RTU**, **Modbus TCP**, or **MQTT**.

---

## ⚠️ Important Safety & Electrical Isolation Rules

> [!CAUTION]
> 1. **STRICTLY READ-ONLY MONITORING**: EcoGrid-Twin operates in 100% read-only mode. It only issues Modbus Function Code `03` (Read Holding Registers) or `04` (Read Input Registers) and subscribes to MQTT topics. It **NEVER** issues control commands, contactor switching, or parameter writes to any inverter, BMS, or grid switchgear.
> 2. **HIGH VOLTAGE WARNING**: Microgrid electrical distribution boards and inverter AC/DC terminals carry hazardous voltages ($415\text{V AC 3-Phase}$, $240\text{V AC Single Phase}$, and up to $1000\text{V DC}$ from solar strings). All physical wiring must be performed by a qualified electrician with power disconnected.
> 3. **GALVANIC ISOLATION**: Always use an **optically isolated USB-to-RS485 industrial converter** to protect the monitoring computer/server from ground loops, high voltage spikes, or lightning transients on long cable runs.

---

## 1. RS485 Modbus RTU Physical Wiring

### 1.1 Pinout Identification
Most RS485 smart meters (Schneider Conzerv, Selec, Elmeasure, Acrel) and solar inverters (Growatt, Sungrow, SMA, Huawei) provide a 2-wire differential terminal block:

| Terminal Label | Common Notation | Wire Color Convention (Suggested) | Description |
| :--- | :--- | :--- | :--- |
| **A** | `D+`, `+`, `RS485+`, `Tx+ / Rx+` | **Red / White-Blue** | Non-inverting differential signal line |
| **B** | `D-`, `-`, `RS485-`, `Tx- / Rx-` | **Black / Blue** | Inverting differential signal line |
| **GND / Shield**| `SG`, `COM`, `Shield`, `Earth` | **Green / Braided Shield** | Signal ground reference & noise drain |

> [!TIP]
> *Note on Polarities*: Some legacy manufacturers label $A$ as inverting and $B$ as non-inverting. If communication fails with zero response, swapping the $A$ and $B$ wires at the converter terminal is standard troubleshooting and will not damage the RS485 transceiver.

### 1.2 Bus Topology & 120Ω Termination
- **Daisy-Chain Topology**: Connect devices sequentially in a daisy-chain (`Converter` → `Meter 1` → `Meter 2` → `Inverter`). **Do NOT use star or tree branching.**
- **Termination Resistors**: Install a $120\ \Omega$ ($0.25\text{W}$) resistor across terminals $A$ and $B$ at the two physical ends of the RS485 cable run to prevent high-frequency packet reflections.
- **Cable Specification**: Use Shielded Twisted Pair (STP) cable (e.g. Belden 9841 or Cat6 twisted pair with foil shield). Connect the shield drain wire to ground at one point only.

```
 [ Server / PC ]
        |
 [ USB-to-RS485 ] (120Ω resistor)
        |
        +======== (STP Cable: A / B / GND) =========+
        |                                           |
 [ Schneider Meter ]                         [ Solar Inverter ] (120Ω resistor)
 (Slave ID: 1)                               (Slave ID: 2)
```

---

## 2. Windows USB-to-RS485 Driver & COM Port Setup

1. Connect the USB-to-RS485 converter (FTDI, CP2102, or CH340 chip) to your Windows PC.
2. Open **Device Manager** (`Win + X` → `Device Manager` or run `devmgmt.msc`).
3. Expand **Ports (COM & LPT)** and note the assigned port number (e.g. `COM3` or `COM4`).
4. In EcoGrid-Twin **Settings** (`http://localhost:5173/settings`):
   - Set **Telemetry Source** to `Live Modbus RTU`.
   - Set **Serial COM Port** to your port (e.g. `COM3`).
   - Set **Baud Rate** to match your meter (typically `9600` or `19200`).
   - Set **Slave ID** to match your meter unit ID (typically `1`).
5. Click **Save Configuration**. The dashboard will connect and display `LIVE` with incoming readings.

---

## 3. Supported Meter & Inverter Register Profiles

EcoGrid-Twin loads register definitions from [`config/device_mapping.example.json`](file:///c:/Users/sudha/Downloads/EcoGrid-Twin/EcoGrid-Twin/config/device_mapping.example.json).

### 3.1 Schneider Electric Conzerv EM6400NG / EM6400
- **Baud Rate**: 9600 | **Parity**: None | **Stop Bits**: 1 | **Function Code**: `03`
- **Register Addresses** (IEEE 754 Float32):
  - Line-to-Neutral Voltage: `3908` ($V$)
  - Average Phase Current: `3912` ($A$)
  - Total Active Power: `3902` ($\text{Scale } 0.001 \to kW$)
  - System Frequency: `3914` ($Hz$)
  - Total Power Factor: `3906` ($PF$)
  - Cumulative Active Energy Import: `3926` ($kWh$)

### 3.2 Selec MFM383A / MFM384 Multifunction Meter
- **Baud Rate**: 9600 | **Parity**: None | **Stop Bits**: 1 | **Function Code**: `03`
- **Register Addresses** (IEEE 754 Float32):
  - Voltage $V_{LN}$: `0` ($V$)
  - Current $I_{avg}$: `6` ($A$)
  - Active Power: `12` ($\text{Scale } 0.001 \to kW$)
  - Frequency: `56` ($Hz$)
  - Power Factor: `18` ($PF$)
  - Active Energy: `64` ($kWh$)

### 3.3 Growatt / Sungrow Solar Inverters
- **Baud Rate**: 9600 | **Function Code**: `04` (Input Registers)
- **Register Addresses**:
  - Solar Active Power: `1` ($\text{Scale } 0.0001 \to kW$)
  - Daily Energy: `53` ($\text{Scale } 0.1 \to kWh$)
  - Inverter Temp: `93` ($\text{Scale } 0.1 \to ^\circ\text{C}$)

---

## 4. MQTT IoT Energy Gateway Setup (Shelly 3EM / Custom)

For wireless monitoring using Wi-Fi smart meters (such as Shelly 3EM, Sonoff Pow, or an ESP32/Raspberry Pi gateway):

1. Configure your meter to publish JSON payloads to an MQTT broker (e.g. Mosquitto on `127.0.0.1:1883` or `broker.emqx.io`).
2. Payload structure for topic `ecogrid/meter/telemetry`:
   ```json
   {
     "total_load_kw": 48.5,
     "voltage": 240.2,
     "current": 67.4,
     "frequency": 50.01,
     "power_factor": 0.98,
     "total_energy_kwh": 3450.2
   }
   ```
3. Payload structure for topic `ecogrid/solar/inverter`:
   ```json
   {
     "pv_power_kw": 72.4,
     "total_yield_kwh": 1240.5,
     "temperature_c": 42.1
   }
   ```
4. In EcoGrid-Twin **Settings**, select `Live MQTT`, enter broker host and topic paths, and click **Save Configuration**.

---

## 5. Troubleshooting & Diagnostics

| Symptom | Probable Cause | Corrective Action |
| :--- | :--- | :--- |
| **Status says `DISCONNECTED` in red** | Serial port not found or no packets received in last 30 seconds. | Check Windows Device Manager for correct COM port number. Confirm USB-to-RS485 converter is plugged in. |
| **All values reading 0.0 or garbage numbers** | Register address offset ($0$-based vs $1$-based indexing) or Byte/Word order mismatch. | In `device_mapping.json`, try toggling `word_order` between `BIG_ENDIAN` and `LITTLE_ENDIAN` (Word Swap). Subtract 1 from register address if meter manual uses 1-based indexing. |
| **CRC / Parity Error in backend log** | Baud rate, parity, or slave ID mismatch between server and meter. | Verify meter front LCD menu settings for baud rate (`9600`), parity (`None`), and slave ID (`1`). |
| **Intermittent communication drops** | Electrical noise from variable frequency drives (VFDs) or missing termination resistor. | Ensure shielded cable is grounded at one end only. Install $120\ \Omega$ termination resistors across terminals $A$ and $B$. |
