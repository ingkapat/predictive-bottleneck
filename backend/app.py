from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import math

app = FastAPI(title="Smart Factory API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load dataset once
df = pd.read_csv("dataset.csv")

MACHINES = ["M1", "M2", "M3", "M4", "M5", "M6"]

MACHINE_META = {
    "M1": {"name": "Station M1", "type": "CNC Milling",        "machineId": "MAC-8821"},
    "M2": {"name": "Station M2", "type": "Welding Assembly",   "machineId": "WLD-042"},
    "M3": {"name": "Station M3", "type": "Painting & Curing",  "machineId": "PNT-119"},
    "M4": {"name": "Station M4", "type": "Quality QA",         "machineId": "QA-001"},
    "M5": {"name": "Station M5", "type": "Packaging Line",     "machineId": "PKG-305"},
    "M6": {"name": "Station M6", "type": "Dispatch & Sorting", "machineId": "DSP-777"},
}

def safe_float(val):
    try:
        v = float(val)
        return 0.0 if math.isnan(v) or math.isinf(v) else round(v, 4)
    except Exception:
        return 0.0

def state_to_status(label: str) -> str:
    if label in ("BOTTLENECK_ACTIVE", "BOTTLENECK_WEAK"):
        return "red"
    if label in ("BLOCK_DOMINANT", "STARVE_DOMINANT", "MIXED_PRESSURE"):
        return "yellow"
    return "green"


@app.get("/api/dashboard")
def dashboard():
    latest = df.iloc[-1]
    history = df.tail(25)

    stations = []
    for m in MACHINES:
        state  = str(latest.get(f"{m}_state_label", "NORMAL"))
        score  = safe_float(latest.get(f"{m}_bottleneck_score", 0))
        b_min  = safe_float(latest.get(f"{m}_blocked_min", 0))
        s_min  = safe_float(latest.get(f"{m}_starved_min", 0))

        if len(df) > 1:
            prev = df.iloc[-2]
            pred_b = safe_float(prev.get(f"{m}_blocked_min", b_min))
        else:
            pred_b = round(b_min * 1.1, 4)

        chart = []
        for _, row in history.iterrows():
            chart.append({
                "time":        str(row["window_index"]),
                "blocked_min": safe_float(row.get(f"{m}_blocked_min", 0)),
                "starved_min": safe_float(row.get(f"{m}_starved_min", 0)),
                "score":       safe_float(row.get(f"{m}_bottleneck_score", 0)),
            })

        meta = MACHINE_META[m]
        stations.append({
            "id":             m.lower(),
            "machineKey":     m,
            "name":           f"{meta['name']} ({meta['type']})",
            "machineId":      meta["machineId"],
            "currentQueue":   b_min,
            "predictedQueue": pred_b,
            "starvedMin":     s_min,
            "riskScore":      score,
            "status":         state_to_status(state),
            "stateLabel":     state,
            "chartData":      chart,
        })

    bn_machine = str(latest.get("bottleneck_machine", "M1"))
    bn_score   = safe_float(latest.get("bottleneck_score", 0))
    bn_gap     = safe_float(latest.get("bottleneck_confidence_gap", 0))

    tail5 = df.tail(5)
    pred_scores  = {m: tail5[f"{m}_bottleneck_score"].mean() for m in MACHINES}
    pred_machine = max(pred_scores, key=pred_scores.get)

    return {
        "stations":            stations,
        "currentBottleneck":   bn_machine.lower(),
        "predictedBottleneck": pred_machine.lower(),
        "bottleneckScore":     bn_score,
        "confidenceGap":       bn_gap,
        "windowIndex":         int(latest["window_index"]),
        "totalWindows":        len(df),
    }


@app.get("/api/station/{machine_id}")
def station_detail(machine_id: str, history_n: int = Query(default=50, ge=5, le=500)):
    m = machine_id.upper()
    if m not in MACHINES:
        return {"error": f"Unknown machine {m}"}

    latest  = df.iloc[-1]
    history = df.tail(history_n)

    chart = []
    for _, row in history.iterrows():
        chart.append({
            "time":        str(row["window_index"]),
            "blocked_min": safe_float(row.get(f"{m}_blocked_min", 0)),
            "starved_min": safe_float(row.get(f"{m}_starved_min", 0)),
            "score":       safe_float(row.get(f"{m}_bottleneck_score", 0)),
            "state":       str(row.get(f"{m}_state_label", "NORMAL")),
        })

    comparison = []
    for mx in MACHINES:
        comparison.append({
            "machine": mx,
            "blocked": safe_float(latest.get(f"{mx}_blocked_min", 0)),
            "starved": safe_float(latest.get(f"{mx}_starved_min", 0)),
            "score":   safe_float(latest.get(f"{mx}_bottleneck_score", 0)),
            "state":   str(latest.get(f"{mx}_state_label", "NORMAL")),
        })

    state = str(latest.get(f"{m}_state_label", "NORMAL"))
    meta  = MACHINE_META[m]

    return {
        "id":           m.lower(),
        "machineKey":   m,
        "name":         f"{meta['name']} ({meta['type']})",
        "machineId":    meta["machineId"],
        "currentQueue": safe_float(latest.get(f"{m}_blocked_min", 0)),
        "starvedMin":   safe_float(latest.get(f"{m}_starved_min", 0)),
        "riskScore":    safe_float(latest.get(f"{m}_bottleneck_score", 0)),
        "status":       state_to_status(state),
        "stateLabel":   state,
        "chartData":    chart,
        "comparison":   comparison,
        "windowIndex":  int(latest["window_index"]),
    }


@app.get("/api/history")
def history(n: int = Query(default=100, ge=10, le=17520)):
    tail = df.tail(n)
    result = []
    for _, row in tail.iterrows():
        result.append({
            "window":  int(row["window_index"]),
            "machine": str(row["bottleneck_machine"]),
            "score":   safe_float(row["bottleneck_score"]),
            "gap":     safe_float(row["bottleneck_confidence_gap"]),
        })
    return result
