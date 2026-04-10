"""
Telemetry Simulator - Sends fake vehicle telemetry to backend API every 5 seconds.
"""

import random
import time
import requests

API_URL = "http://localhost:8000/api/telemetry"
INTERVAL = 5  # seconds


def generate_telemetry():
    return {
        "engine_temp":      random.randint(70, 120),
        "battery_voltage":  round(random.uniform(11.5, 13.5), 2),
        "oil_life":         random.randint(10, 100),
    }


def run():
    print(f"Simulator started. Sending to {API_URL} every {INTERVAL}s...\n")

    while True:
        payload = generate_telemetry()

        try:
            response = requests.post(API_URL, json=payload, timeout=5)
            print(f"Sent: {payload} | Response: {response.status_code}")
        except requests.exceptions.ConnectionError:
            print(f"Sent: {payload} | Error: Cannot connect to {API_URL}")
        except requests.exceptions.Timeout:
            print(f"Sent: {payload} | Error: Request timed out")
        except requests.exceptions.RequestException as e:
            print(f"Sent: {payload} | Error: {e}")

        time.sleep(INTERVAL)


if __name__ == "__main__":
    run()
