"""
predict.py
----------
1. โหลด LSTM model + scalers
2. รัน inference บน new_features.csv  -> new_predictions.csv
3. รัน assign_window_labels           -> predicted_labeled.csv
4. merge กับ dataset.csv              -> dataset_with_pred.csv

รัน: python predict.py
"""

import json
import joblib
import numpy as np
import pandas as pd
from tensorflow.keras.models import load_model

# ─── Config ───────────────────────────────────────────────────────────────────
LOOKBACK    = 10
MODEL_DIR   = "lstm_multioutput_results"
MACHINES    = ["M1", "M2", "M3", "M4", "M5", "M6"]
ACTIVE_MIN_MINUTES = 1.0   # threshold สำหรับ BLOCK/STARVE_DOMINANT

INPUT_CSV   = "new_features.csv"   # input features ใหม่
PRED_CSV    = "new_predictions.csv"
LABELED_CSV = "predicted_labeled.csv"
MERGED_CSV  = "dataset_with_pred.csv"
# ──────────────────────────────────────────────────────────────────────────────


def assign_window_labels(df_score: pd.DataFrame) -> pd.DataFrame:
    """คำนวณ bottleneck_machine, state_label, confidence_gap จาก score"""
    out = df_score.copy()
    score_cols   = [f"{m}_bottleneck_score"          for m in MACHINES]
    pred_cols    = [f"{m}_predicted_bottleneck_score" for m in MACHINES]

    # ── actual labels (ถ้ามี score_cols) ──────────────────────────────────────
    if all(c in out.columns for c in score_cols):
        score_matrix = out[score_cols].to_numpy()
        max_idx = np.argmax(score_matrix, axis=1)
        out["bottleneck_machine"] = [MACHINES[i] for i in max_idx]
        out["bottleneck_score"]   = score_matrix[np.arange(len(out)), max_idx]
        sorted_s = np.sort(score_matrix, axis=1)
        top1 = sorted_s[:, -1]
        top2 = sorted_s[:, -2] if score_matrix.shape[1] > 1 else np.zeros(len(out))
        out["bottleneck_confidence_gap"] = top1 - top2

        for m in MACHINES:
            tb     = out[f"{m}_tb"]
            ts     = out[f"{m}_ts"]
            active = (out.get(f"{m}_block_active_flag", 0) == 1) | \
                     (out.get(f"{m}_starve_active_flag", 0) == 1)
            is_bn  = out["bottleneck_machine"] == m
            states = []
            for i in range(len(out)):
                tb_i     = float(tb.iloc[i])
                ts_i     = float(ts.iloc[i])
                active_i = bool(active.iloc[i])
                bn_i     = bool(is_bn.iloc[i])
                if   bn_i and active_i:                                          state = "BOTTLENECK_ACTIVE"
                elif bn_i and not active_i:                                      state = "BOTTLENECK_WEAK"
                elif tb_i >= ACTIVE_MIN_MINUTES and ts_i < ACTIVE_MIN_MINUTES:  state = "BLOCK_DOMINANT"
                elif ts_i >= ACTIVE_MIN_MINUTES and tb_i < ACTIVE_MIN_MINUTES:  state = "STARVE_DOMINANT"
                elif tb_i >= ACTIVE_MIN_MINUTES and ts_i >= ACTIVE_MIN_MINUTES: state = "MIXED_PRESSURE"
                else:                                                            state = "NORMAL"
                states.append(state)
            out[f"{m}_state_label"]    = states
            out[f"{m}_is_bottleneck"]  = is_bn.astype(int)

    # ── predicted labels (จาก LSTM output) ────────────────────────────────────
    if all(c in out.columns for c in pred_cols):
        pred_matrix = out[pred_cols].to_numpy()
        pred_max_idx = np.argmax(pred_matrix, axis=1)
        out["predicted_bottleneck_machine"] = [MACHINES[i] for i in pred_max_idx]
        out["predicted_bottleneck_score"]   = pred_matrix[np.arange(len(out)), pred_max_idx]
        sorted_p = np.sort(pred_matrix, axis=1)
        top1p = sorted_p[:, -1]
        top2p = sorted_p[:, -2] if pred_matrix.shape[1] > 1 else np.zeros(len(out))
        out["predicted_confidence_gap"] = top1p - top2p

        for m in MACHINES:
            tb    = out.get(f"{m}_tb",  pd.Series(np.zeros(len(out))))
            ts    = out.get(f"{m}_ts",  pd.Series(np.zeros(len(out))))
            is_bn = out["predicted_bottleneck_machine"] == m
            states = []
            for i in range(len(out)):
                tb_i = float(tb.iloc[i])
                ts_i = float(ts.iloc[i])
                bn_i = bool(is_bn.iloc[i])
                if   bn_i and (tb_i >= ACTIVE_MIN_MINUTES or ts_i >= ACTIVE_MIN_MINUTES): state = "BOTTLENECK_ACTIVE"
                elif bn_i:                                                                  state = "BOTTLENECK_WEAK"
                elif tb_i >= ACTIVE_MIN_MINUTES and ts_i < ACTIVE_MIN_MINUTES:            state = "BLOCK_DOMINANT"
                elif ts_i >= ACTIVE_MIN_MINUTES and tb_i < ACTIVE_MIN_MINUTES:            state = "STARVE_DOMINANT"
                elif tb_i >= ACTIVE_MIN_MINUTES and ts_i >= ACTIVE_MIN_MINUTES:           state = "MIXED_PRESSURE"
                else:                                                                       state = "NORMAL"
                states.append(state)
            out[f"{m}_predicted_state_label"] = states

    return out


def run_prediction():
    print("── Loading model & scalers ──────────────────────────────────────────")
    model   = load_model(f"{MODEL_DIR}/lstm_multioutput_bottleneck_model.keras")

    with open(f"{MODEL_DIR}/feature_cols.json") as f:
        feature_cols = json.load(f)
    with open(f"{MODEL_DIR}/target_cols.json") as f:
        target_cols = json.load(f)

    x_scaler = joblib.load(f"{MODEL_DIR}/x_scaler.pkl")
    y_scaler = joblib.load(f"{MODEL_DIR}/y_scaler.pkl")

    print("── Loading input features ───────────────────────────────────────────")
    df = pd.read_csv(INPUT_CSV)
    if "window_index" in df.columns:
        df = df.sort_values("window_index").reset_index(drop=True)

    X        = df[feature_cols].ffill().bfill()
    X_scaled = x_scaler.transform(X)
    X_seq    = np.array(
        [X_scaled[i - LOOKBACK:i] for i in range(LOOKBACK, len(X_scaled) + 1)],
        dtype=np.float32,
    )

    print(f"── Predicting {len(X_seq)} sequences ──────────────────────────────────")
    pred_scaled = model.predict(X_seq, verbose=1)
    pred        = y_scaler.inverse_transform(pred_scaled)

    # target_cols คือ M1_bottleneck_score … M6_bottleneck_score (actual names)
    # เปลี่ยนชื่อ output เป็น predicted_ เพื่อแยกจาก actual
    pred_renamed = [f"{c.replace('_bottleneck_score','')}_predicted_bottleneck_score"
                    if "_bottleneck_score" in c else f"predicted_{c}"
                    for c in target_cols]

    pred_df = pd.DataFrame(pred, columns=pred_renamed)

    # align index: prediction เริ่มจาก row LOOKBACK
    pred_df.index = df.index[LOOKBACK - 1: LOOKBACK - 1 + len(pred_df)]
    pred_df.to_csv(PRED_CSV, index=False)
    print(f"Saved predictions → {PRED_CSV}")

    print("── Assign window labels ─────────────────────────────────────────────")
    # merge input + predictions
    merged = df.join(pred_df, how="left")
    labeled = assign_window_labels(merged)
    labeled.to_csv(LABELED_CSV, index=False)
    print(f"Saved labeled     → {LABELED_CSV}")

    print("── Merge with full dataset ──────────────────────────────────────────")
    try:
        full = pd.read_csv("dataset.csv")
        if "window_index" in full.columns and "window_index" in labeled.columns:
            pred_cols_to_add = [c for c in labeled.columns if "predicted" in c]
            full = full.merge(
                labeled[["window_index"] + pred_cols_to_add],
                on="window_index", how="left"
            )
        full.to_csv(MERGED_CSV, index=False)
        print(f"Saved merged      → {MERGED_CSV}")
    except FileNotFoundError:
        print("dataset.csv not found — skipping merge step")

    print("── Done ─────────────────────────────────────────────────────────────")
    return labeled


if __name__ == "__main__":
    run_prediction()
