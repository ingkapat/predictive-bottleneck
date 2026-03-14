"""
prepare_features.py
-------------------
สร้าง new_features.csv จาก dataset.csv
เพื่อใช้เป็น input ของ predict.py

- ดึง feature_cols จากที่ train.py บันทึกไว้
- เอา rows ล่าสุด (หรือทั้งหมด) ออกมา

รัน: python prepare_features.py
"""

import json
import pandas as pd

DATASET_CSV   = "dataset.csv"
OUTPUT_CSV    = "new_features.csv"
FEATURE_JSON  = "lstm_multioutput_results/feature_cols.json"

# โหลด feature_cols ที่ train ไว้
with open(FEATURE_JSON) as f:
    feature_cols = json.load(f)

df = pd.read_csv(DATASET_CSV)
if "window_index" in df.columns:
    df = df.sort_values("window_index").reset_index(drop=True)

# เอาทุก column ที่ predict.py ต้องการ
# (feature_cols + window_index + tb/ts สำหรับ assign_window_labels)
keep_extras = ["window_index"] + [c for c in df.columns if "_tb" in c or "_ts" in c]
keep_cols   = list(dict.fromkeys(keep_extras + feature_cols))  # unique + preserve order
keep_cols   = [c for c in keep_cols if c in df.columns]

df[keep_cols].to_csv(OUTPUT_CSV, index=False)
print(f"✅ Saved {len(df)} rows → {OUTPUT_CSV}")
print(f"   Columns: {len(keep_cols)}")
