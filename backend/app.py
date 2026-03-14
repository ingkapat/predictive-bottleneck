from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import math
import os

app = FastAPI(title="Smart Factory API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

DATA_FILE = "dataset_with_pred.csv" if os.path.exists("dataset_with_pred.csv") else "dataset.csv"
df = pd.read_csv(DATA_FILE)
HAS_PRED = any("predicted" in c for c in df.columns)
print(f"Loaded: {DATA_FILE} | rows={len(df)} | has_predictions={HAS_PRED}")

MACHINES = ["M1", "M2", "M3", "M4", "M5", "M6"]
MACHINE_META = {
    "M1": {"name": "Station M1", "type": "CNC Milling",        "machineId": "MAC-8821"},
    "M2": {"name": "Station M2", "type": "Welding Assembly",   "machineId": "WLD-042"},
    "M3": {"name": "Station M3", "type": "Painting & Curing",  "machineId": "PNT-119"},
    "M4": {"name": "Station M4", "type": "Quality QA",         "machineId": "QA-001"},
    "M5": {"name": "Station M5", "type": "Packaging Line",     "machineId": "PKG-305"},
    "M6": {"name": "Station M6", "type": "Dispatch & Sorting", "machineId": "DSP-777"},
}
ACTIVE_MIN = 1.0


def safe_float(val):
    try:
        v = float(val)
        return 0.0 if math.isnan(v) or math.isinf(v) else round(v, 4)
    except Exception:
        return 0.0


def state_to_status(label: str) -> str:
    if label in ("BOTTLENECK_ACTIVE", "BOTTLENECK_WEAK"):                        return "red"
    if label in ("BLOCK_DOMINANT", "STARVE_DOMINANT", "MIXED_PRESSURE"):         return "yellow"
    return "green"


def calc_state(tb: float, ts: float, is_bn: bool) -> str:
    if is_bn and (tb >= ACTIVE_MIN or ts >= ACTIVE_MIN): return "BOTTLENECK_ACTIVE"
    if is_bn:                                             return "BOTTLENECK_WEAK"
    if tb >= ACTIVE_MIN and ts < ACTIVE_MIN:              return "BLOCK_DOMINANT"
    if ts >= ACTIVE_MIN and tb < ACTIVE_MIN:              return "STARVE_DOMINANT"
    if tb >= ACTIVE_MIN and ts >= ACTIVE_MIN:             return "MIXED_PRESSURE"
    return "NORMAL"


def get_pred_state(row, m: str) -> str:
    if HAS_PRED:
        saved = str(row.get(f"{m}_predicted_state_label", ""))
        if saved and saved != "nan":
            return saved
        pred_bn = str(row.get("predicted_bottleneck_machine", ""))
        return calc_state(
            safe_float(row.get(f"{m}_tb", 0)),
            safe_float(row.get(f"{m}_ts", 0)),
            pred_bn == m,
        )
    return "NORMAL"


@app.get("/api/dashboard")
def dashboard():
    latest  = df.iloc[-1]
    history = df.tail(25)

    stations = []
    for m in MACHINES:
        state      = str(latest.get(f"{m}_state_label", "NORMAL"))
        pred_state = get_pred_state(latest, m)
        score      = safe_float(latest.get(f"{m}_bottleneck_score", 0))
        pred_score = safe_float(latest.get(f"{m}_predicted_bottleneck_score", 0)) if HAS_PRED else 0.0
        b_min      = safe_float(latest.get(f"{m}_blocked_min", 0))
        s_min      = safe_float(latest.get(f"{m}_starved_min", 0))

        # predicted block/starve: ใช้ tb/ts จาก predicted window
        pred_b_min = safe_float(latest.get(f"{m}_tb", 0)) if HAS_PRED else b_min
        pred_s_min = safe_float(latest.get(f"{m}_ts", 0)) if HAS_PRED else s_min

        chart = [
            {
                "time":           str(r["window_index"]),
                "blocked_min":    safe_float(r.get(f"{m}_blocked_min", 0)),
                "starved_min":    safe_float(r.get(f"{m}_starved_min", 0)),
                "score":          safe_float(r.get(f"{m}_bottleneck_score", 0)),
                "predictedScore": safe_float(r.get(f"{m}_predicted_bottleneck_score", 0)) if HAS_PRED else 0.0,
            }
            for _, r in history.iterrows()
        ]

        meta = MACHINE_META[m]
        stations.append({
            "id":                  m.lower(),
            "machineKey":          m,
            "name":                f"{meta['name']} ({meta['type']})",
            "machineId":           meta["machineId"],
            "currentQueue":        b_min,
            "starvedMin":          s_min,
            "predictedQueue":      pred_b_min,      # ← predicted block time
            "predictedStarvedMin": pred_s_min,      # ← predicted starved time
            "riskScore":           score,
            "predictedScore":      pred_score,
            "status":              state_to_status(state),
            "predictedStatus":     state_to_status(pred_state),
            "stateLabel":          state,
            "predictedStateLabel": pred_state,
            "chartData":           chart,
        })

    # current bottleneck
    bn_machine = str(latest.get("bottleneck_machine", "M1"))
    bn_score   = safe_float(latest.get("bottleneck_score", 0))
    bn_gap     = safe_float(latest.get("bottleneck_confidence_gap", 0))

    # predicted bottleneck
    if HAS_PRED:
        pred_bn = str(latest.get("predicted_bottleneck_machine", ""))
        if not pred_bn or pred_bn == "nan":
            pscores = {m: safe_float(latest.get(f"{m}_predicted_bottleneck_score", 0)) for m in MACHINES}
            pred_bn = max(pscores, key=pscores.get)
        pred_bn_score = safe_float(latest.get("predicted_bottleneck_score", 0))
        pred_bn_gap   = safe_float(latest.get("predicted_confidence_gap", 0))
    else:
        tail5         = df.tail(5)
        pscores       = {m: tail5[f"{m}_bottleneck_score"].mean() for m in MACHINES}
        pred_bn       = max(pscores, key=pscores.get)
        pred_bn_score = pscores[pred_bn]
        pred_bn_gap   = 0.0

    return {
        "stations":                 stations,
        "currentBottleneck":        bn_machine.lower(),
        "predictedBottleneck":      pred_bn.lower(),
        "bottleneckScore":          bn_score,
        "predictedBottleneckScore": pred_bn_score,
        "confidenceGap":            bn_gap,
        "predictedConfidenceGap":   pred_bn_gap,   # ← fixed
        "windowIndex":              int(latest["window_index"]),
        "totalWindows":             len(df),
        "hasPredictions":           HAS_PRED,
    }


@app.get("/api/station/{machine_id}")
def station_detail(machine_id: str, history_n: int = Query(default=50, ge=5, le=500)):
    m = machine_id.upper()
    if m not in MACHINES:
        return {"error": f"Unknown machine {m}"}

    latest  = df.iloc[-1]
    history = df.tail(history_n)

    chart = [
        {
            "time":           str(r["window_index"]),
            "blocked_min":    safe_float(r.get(f"{m}_blocked_min", 0)),
            "starved_min":    safe_float(r.get(f"{m}_starved_min", 0)),
            "score":          safe_float(r.get(f"{m}_bottleneck_score", 0)),
            "predictedScore": safe_float(r.get(f"{m}_predicted_bottleneck_score", 0)) if HAS_PRED else 0.0,
            "state":          str(r.get(f"{m}_state_label", "NORMAL")),
        }
        for _, r in history.iterrows()
    ]

    comparison = []
    for mx in MACHINES:
        comparison.append({
            "machine":        mx,
            "blocked":        safe_float(latest.get(f"{mx}_blocked_min", 0)),
            "starved":        safe_float(latest.get(f"{mx}_starved_min", 0)),
            "score":          safe_float(latest.get(f"{mx}_bottleneck_score", 0)),
            "predictedScore": safe_float(latest.get(f"{mx}_predicted_bottleneck_score", 0)) if HAS_PRED else 0.0,
            "state":          str(latest.get(f"{mx}_state_label", "NORMAL")),
            "predictedState": get_pred_state(latest, mx),
        })

    state      = str(latest.get(f"{m}_state_label", "NORMAL"))
    pred_state = get_pred_state(latest, m)
    meta       = MACHINE_META[m]

    pred_b_min = safe_float(latest.get(f"{m}_tb", 0)) if HAS_PRED else safe_float(latest.get(f"{m}_blocked_min", 0))
    pred_s_min = safe_float(latest.get(f"{m}_ts", 0)) if HAS_PRED else safe_float(latest.get(f"{m}_starved_min", 0))

    return {
        "id":                  m.lower(),
        "machineKey":          m,
        "name":                f"{meta['name']} ({meta['type']})",
        "machineId":           meta["machineId"],
        "currentQueue":        safe_float(latest.get(f"{m}_blocked_min", 0)),
        "starvedMin":          safe_float(latest.get(f"{m}_starved_min", 0)),
        "predictedQueue":      pred_b_min,
        "predictedStarvedMin": pred_s_min,
        "riskScore":           safe_float(latest.get(f"{m}_bottleneck_score", 0)),
        "predictedScore":      safe_float(latest.get(f"{m}_predicted_bottleneck_score", 0)) if HAS_PRED else 0.0,
        "status":              state_to_status(state),
        "predictedStatus":     state_to_status(pred_state),
        "stateLabel":          state,
        "predictedStateLabel": pred_state,
        "chartData":           chart,
        "comparison":          comparison,
        "windowIndex":         int(latest["window_index"]),
        "hasPredictions":      HAS_PRED,
    }


@app.get("/api/history")
def history(n: int = Query(default=100, ge=10, le=17520)):
    tail = df.tail(n)
    result = []
    for _, row in tail.iterrows():
        result.append({
            "window":           int(row["window_index"]),
            "machine":          str(row["bottleneck_machine"]),
            "score":            safe_float(row["bottleneck_score"]),
            "gap":              safe_float(row["bottleneck_confidence_gap"]),
            "predictedMachine": str(row.get("predicted_bottleneck_machine", "")) if HAS_PRED else "",
            "predictedScore":   safe_float(row.get("predicted_bottleneck_score", 0)) if HAS_PRED else 0.0,
        })
    return result
