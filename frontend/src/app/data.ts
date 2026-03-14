export const API_BASE = "https://predictive-bottleneck.onrender.com";

export interface ChartData {
  time: string;
  blocked_min: number;
  starved_min: number;
  score: number;
  state?: string;
}

export interface Station {
  id: string;
  machineKey: string;
  name: string;
  machineId: string;
  currentQueue: number;
  predictedQueue: number;
  starvedMin: number;
  riskScore: number;
  status: "red" | "yellow" | "green";
  stateLabel: string;
  chartData: ChartData[];
}

export interface DashboardData {
  stations: Station[];
  currentBottleneck: string;
  predictedBottleneck: string;
  bottleneckScore: number;
  confidenceGap: number;
  windowIndex: number;
  totalWindows: number;
}

export interface StationDetailData extends Station {
  comparison: {
    machine: string;
    blocked: number;
    starved: number;
    score: number;
    state: string;
  }[];
}

export async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch(`${API_BASE}/api/dashboard`);
  if (!res.ok) throw new Error("Failed to fetch dashboard");
  return res.json();
}

export async function fetchStation(machineId: string, historyN = 50): Promise<StationDetailData> {
  const res = await fetch(`${API_BASE}/api/station/${machineId}?history_n=${historyN}`);
  if (!res.ok) throw new Error("Failed to fetch station");
  return res.json();
}

export async function fetchHistory(n = 100) {
  const res = await fetch(`${API_BASE}/api/history?n=${n}`);
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}
