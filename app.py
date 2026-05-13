import os
import sys
import json
from datetime import datetime, timedelta

try:
    import pvlib
    import pandas as pd
    import numpy as np
    from pvlib.pvsystem import PVSystem, Array, FixedMount
    from pvlib.modelchain import ModelChain
    from pvlib.location import Location
    PVLIB_AVAILABLE = True
except ImportError:
    PVLIB_AVAILABLE = False

try:
    from flask import Flask, request, jsonify
    FLASK_AVAILABLE = True
except ImportError:
    FLASK_AVAILABLE = False


def run_simulation(latitude, longitude, tilt, azimuth, capacity_w, date_str, timezone=None):
    if not PVLIB_AVAILABLE:
        raise RuntimeError("pvlib is not installed")

    if timezone is None:
        timezone = "UTC"

    location = Location(latitude=latitude, longitude=longitude, tz=timezone)

    start = pd.Timestamp(date_str, tz=timezone)
    end = start + pd.Timedelta(days=1) - pd.Timedelta(minutes=5)
    times = pd.date_range(start=start, end=end, freq="5min")

    module_parameters = {
        "pdc0": capacity_w,
        "gamma_pdc": -0.003,
    }
    temp_model_params = pvlib.temperature.TEMPERATURE_MODEL_PARAMETERS["sapm"]["open_rack_glass_glass"]

    mount = FixedMount(surface_tilt=tilt, surface_azimuth=azimuth)
    array = Array(
        mount=mount,
        module_parameters=module_parameters,
        temperature_model_parameters=temp_model_params,
    )
    system = PVSystem(arrays=[array], inverter_parameters={"pdc0": capacity_w})
    mc = ModelChain(system, location, spectral_model="no_loss", aoi_model="physical")

    clearsky = location.get_clearsky(times)
    mc.run_model(clearsky)

    ac_series = mc.results.ac
    ac_values = ac_series.clip(lower=0)

    total_energy_wh = float(ac_values.sum() / 12)
    peak_power_w = float(ac_values.max())
    peak_idx = ac_values.idxmax()
    peak_time = peak_idx.isoformat() if not pd.isna(peak_idx) else ""

    positive_mask = ac_values > 0
    sunshine_hours = float(positive_mask.sum() / 12)

    timestamps = [t.isoformat() for t in ac_values.index]
    ac_list = [round(float(v), 2) for v in ac_values.values]

    return {
        "timestamps": timestamps,
        "ac_power_w": ac_list,
        "total_energy_wh": round(total_energy_wh, 2),
        "peak_power_w": round(peak_power_w, 2),
        "peak_time": peak_time,
        "sunshine_hours": round(sunshine_hours, 2),
    }


def find_optimal_tilt(latitude, longitude, capacity_w, date_str, timezone=None, azimuth=180):
    if not PVLIB_AVAILABLE:
        raise RuntimeError("pvlib is not installed")

    if timezone is None:
        timezone = "UTC"

    tilt_range = list(range(0, 91, 5))
    results = []

    for tilt in tilt_range:
        sim = run_simulation(latitude, longitude, tilt, azimuth, capacity_w, date_str, timezone)
        results.append({"tilt": tilt, "energy_wh": sim["total_energy_wh"]})

    best = max(results, key=lambda x: x["energy_wh"])

    return {
        "optimal_tilt": best["tilt"],
        "best_energy_wh": best["energy_wh"],
        "tilt_energies": results,
    }


if FLASK_AVAILABLE:
    app = Flask(__name__)

    @app.route("/healthz", methods=["GET"])
    def health():
        return jsonify({"status": "ok", "pvlib": PVLIB_AVAILABLE})

    @app.route("/simulate", methods=["POST"])
    def simulate():
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "Request body required"}), 400

            required = ["latitude", "longitude", "tilt", "azimuth", "capacity_w", "date"]
            for field in required:
                if field not in data:
                    return jsonify({"error": f"Missing required field: {field}"}), 400

            result = run_simulation(
                latitude=float(data["latitude"]),
                longitude=float(data["longitude"]),
                tilt=float(data["tilt"]),
                azimuth=float(data["azimuth"]),
                capacity_w=float(data["capacity_w"]),
                date_str=data["date"],
                timezone=data.get("timezone", "UTC"),
            )
            return jsonify(result)

        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/simulate/optimal-tilt", methods=["POST"])
    def optimal_tilt():
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "Request body required"}), 400

            required = ["latitude", "longitude", "capacity_w", "date"]
            for field in required:
                if field not in data:
                    return jsonify({"error": f"Missing required field: {field}"}), 400

            result = find_optimal_tilt(
                latitude=float(data["latitude"]),
                longitude=float(data["longitude"]),
                capacity_w=float(data["capacity_w"]),
                date_str=data["date"],
                timezone=data.get("timezone", "UTC"),
                azimuth=float(data.get("azimuth", 180)),
            )
            return jsonify(result)

        except Exception as e:
            return jsonify({"error": str(e)}), 500

#    if __name__ == "__main__":
#        port = int(os.environ.get("SOLAR_SIM_PORT", "5001"))
#        app.run(host="0.0.0.0", port=port, debug=False)
#else:
#    print("Flask not available. Install with: pip install flask", file=sys.stderr)
#    sys.exit(1)
