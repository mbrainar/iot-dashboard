# IoT Device Status Dashboard

Flask + SQLite app that receives status check-ins from Windows machines and
displays them on a web dashboard.

## What's included

- `app/` — Flask application (API + dashboard UI)
- `Dockerfile`, `docker-compose.yml` — containerized deployment
- `scripts/checkin.ps1` — run on each Windows "device", POSTs hostname/IP/time to the API
- `scripts/register_task.ps1` — registers a Windows Scheduled Task that runs `checkin.ps1` on a timer

## 1. Run the server

```bash
docker compose up -d --build
```

The dashboard is at `http://<server-host>:8080/`. Data persists in the
`iot-data` Docker volume (SQLite file), so it survives container restarts.

Configuration (edit `docker-compose.yml`):

- `API_KEY` — if set, devices must send this value in an `X-API-Key` header on check-in. Leave blank to allow unauthenticated check-ins (fine for a trusted LAN).
- `STALE_AFTER_MINUTES` — a device shows as offline (red dot) if it hasn't checked in within this many minutes. Default 10.

## 2. Point Windows devices at it

Copy the `scripts/` folder to each Windows machine (or a shared location),
then from an **elevated** PowerShell prompt:

```powershell
.\register_task.ps1 -ApiUrl "http://<server-host>:8080/api/checkin" -IntervalMinutes 5
```

Add `-ApiKey "yourkey"` if you set `API_KEY` on the server. This registers a
Scheduled Task (running as SYSTEM) that checks in every 5 minutes, starting
immediately and continuing across reboots.

Run a one-off check-in manually to test it first:

```powershell
.\checkin.ps1 -ApiUrl "http://<server-host>:8080/api/checkin"
```

### Plain curl.exe equivalent

If you'd rather not use the PowerShell script, `curl.exe` ships with Windows 10/11:

```bat
curl.exe -s -X POST "http://<server-host>:8080/api/checkin" ^
  -H "Content-Type: application/json" ^
  -d "{\"hostname\":\"%COMPUTERNAME%\",\"ip_address\":\"<fill-in>\",\"device_time\":\"%date% %time%\"}"
```

You still need something to fill in the current IP address and format the
timestamp reliably, which is why `checkin.ps1` is the recommended path — it
handles both and parses cleanly on the server (ISO 8601 timestamps).

## API

`POST /api/checkin`

```json
{
  "hostname": "DESKTOP-ABC123",
  "ip_address": "192.168.1.42",
  "device_time": "2026-09-18T14:32:10-04:00"
}
```

Optional header: `X-API-Key: <key>` (required only if `API_KEY` is set on the server).

Response: `201 Created` with the stored record, or `400`/`401` on error.

`GET /api/devices` — JSON list of each device's latest status (used by the dashboard for live updates).

## Dashboard

- `/` — one row per device: hostname, IP, last check-in (device-reported time), and time since last check-in (computed from server receive time, refreshes live). Click a hostname to see full history.
- `/device/<hostname>` — paginated history of every check-in for that device.

## Local development (without Docker)

```bash
cd app
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
set DB_PATH=.\iot-dev.db
python app.py
```

Serves on `http://localhost:5000`.
