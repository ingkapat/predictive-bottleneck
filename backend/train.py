"""
train.py
--------
1. โหลด dataset.csv
2. แยก feature_cols / target_cols
3. Scale + สร้าง sequence (LOOKBACK=10)
4. เทรน LSTM multi-output model
5. Save ลง lstm_multioutput_results/
   - lstm_multioutput_bottleneck_model.keras
   - feature_cols.json
   - target_cols.json
   - x_scaler.pkl
   - y_scaler.pkl

รัน: python train.py
"""

import os, json
import numpy as np
import pandas as pd
import joblib
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint

# ─── Config ───────────────────────────────────────────────────────────────────
LOOKBACK    = 10
MACHINES    = ["M1", "M2", "M3", "M4", "M5", "M6"]
DATASET_CSV = "dataset.csv"
OUTPUT_DIR  = "lstm_multioutput_results"
EPOCHS      = 50
BATCH_SIZE  = 64
VAL_SPLIT   = 0.2
# ──────────────────────────────────────────────────────────────────────────────

os.makedirs(OUTPUT_DIR, exist_ok=True)

print("── Loading dataset ──────────────────────────────────────────────────")
df = pd.read_csv(DATASET_CSV)
if "window_index" in df.columns:
    df = df.sort_values("window_index").reset_index(drop=True)
print(f"   Shape: {df.shape}")

# ─── กำหนด target cols ────────────────────────────────────────────────────────
target_cols = [f"{m}_bottleneck_score" for m in MACHINES]

# ─── กำหนด feature cols (เอาเฉพาะ numeric ที่ไม่ใช่ target / label) ────────
exclude = set(target_cols) | {
    "window_index", "bottleneck_machine", "bottleneck_score",
    "bottleneck_confidence_gap",
}
# เอาออก state_label, is_bottleneck (categorical / derived)
exclude |= {c for c in df.columns if "state_label" in c or "is_bottleneck" in c}

feature_cols = [
    c for c in df.columns
    if c not in exclude and pd.api.types.is_numeric_dtype(df[c])
]
print(f"   Features: {len(feature_cols)}  |  Targets: {len(target_cols)}")

# ─── Save column lists ────────────────────────────────────────────────────────
with open(f"{OUTPUT_DIR}/feature_cols.json", "w") as f:
    json.dump(feature_cols, f)
with open(f"{OUTPUT_DIR}/target_cols.json", "w") as f:
    json.dump(target_cols, f)

# ─── Scale ────────────────────────────────────────────────────────────────────
print("── Scaling ──────────────────────────────────────────────────────────")
X_raw = df[feature_cols].ffill().bfill().values
y_raw = df[target_cols].ffill().bfill().values

x_scaler = MinMaxScaler()
y_scaler = MinMaxScaler()

X_scaled = x_scaler.fit_transform(X_raw)
y_scaled = y_scaler.fit_transform(y_raw)

joblib.dump(x_scaler, f"{OUTPUT_DIR}/x_scaler.pkl")
joblib.dump(y_scaler, f"{OUTPUT_DIR}/y_scaler.pkl")
print("   Scalers saved.")

# ─── Build sequences ──────────────────────────────────────────────────────────
print("── Building sequences ───────────────────────────────────────────────")
X_seq, y_seq = [], []
for i in range(LOOKBACK, len(X_scaled) + 1):
    X_seq.append(X_scaled[i - LOOKBACK:i])
    y_seq.append(y_scaled[i - 1])          # target ของ window สุดท้าย

X_seq = np.array(X_seq, dtype=np.float32)
y_seq = np.array(y_seq, dtype=np.float32)
print(f"   X_seq: {X_seq.shape}  |  y_seq: {y_seq.shape}")

# ─── Train/Val split ──────────────────────────────────────────────────────────
X_train, X_val, y_train, y_val = train_test_split(
    X_seq, y_seq, test_size=VAL_SPLIT, shuffle=False
)
print(f"   Train: {X_train.shape}  |  Val: {X_val.shape}")

# ─── Model ────────────────────────────────────────────────────────────────────
print("── Building model ───────────────────────────────────────────────────")
inp = Input(shape=(LOOKBACK, len(feature_cols)))
x   = LSTM(128, return_sequences=True)(inp)
x   = Dropout(0.2)(x)
x   = LSTM(64)(x)
x   = Dropout(0.2)(x)
x   = Dense(64, activation="relu")(x)
out = Dense(len(target_cols), activation="linear")(x)

model = Model(inp, out)
model.compile(optimizer="adam", loss="mse", metrics=["mae"])
model.summary()

# ─── Callbacks ────────────────────────────────────────────────────────────────
model_path = f"{OUTPUT_DIR}/lstm_multioutput_bottleneck_model.keras"
callbacks = [
    EarlyStopping(patience=8, restore_best_weights=True, verbose=1),
    ModelCheckpoint(model_path, save_best_only=True, verbose=1),
]

# ─── Train ────────────────────────────────────────────────────────────────────
print("── Training ─────────────────────────────────────────────────────────")
history = model.fit(
    X_train, y_train,
    validation_data=(X_val, y_val),
    epochs=EPOCHS,
    batch_size=BATCH_SIZE,
    callbacks=callbacks,
)

print(f"\n✅ Model saved → {model_path}")
print(f"   feature_cols.json, target_cols.json, x_scaler.pkl, y_scaler.pkl")
print("\n── Done! ────────────────────────────────────────────────────────────")
print("Next step: python prepare_features.py  →  python predict.py")
