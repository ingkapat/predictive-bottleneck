import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt

# Page title
st.title("🏭 Smart Factory Dashboard")
st.subheader("Predictive Bottleneck Detector")

# Load data
df = pd.read_csv("dataset.csv")

stations = ["station_a", "station_b", "station_c", "station_d"]

# Latest data
latest = df.iloc[-1]

# -----------------------------
# Queue Status
# -----------------------------

st.header("Queue Status")

col1, col2, col3, col4 = st.columns(4)

col1.metric("Station A", latest["station_a"])
col2.metric("Station B", latest["station_b"])
col3.metric("Station C", latest["station_c"])
col4.metric("Station D", latest["station_d"])

# -----------------------------
# Line Chart
# -----------------------------

st.header("Queue Length Over Time")

fig, ax = plt.subplots()

for s in stations:
    ax.plot(df["time"], df[s], label=s)

ax.set_xlabel("Time")
ax.set_ylabel("Queue Length")
ax.legend()

st.pyplot(fig)

# -----------------------------
# Current Bottleneck
# -----------------------------

st.header("Current Bottleneck")
current_bottleneck = latest[stations].idxmax()
st.error(f"⚠ Current Bottleneck: {current_bottleneck}")

st.header("Predicted Bottleneck")
prediction = df[stations].diff().mean()
future_queue = latest[stations] + prediction
predicted_bottleneck = future_queue.idxmax()
st.warning(f"🔮 Predicted Bottleneck: {predicted_bottleneck}")