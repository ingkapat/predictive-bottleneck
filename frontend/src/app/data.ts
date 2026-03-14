export interface ChartData {
  time: string;
  queue: number;
  utilization: number;
}

export interface Station {
  id: string;
  name: string;
  currentQueue: number;
  predictedQueue: number;
  riskScore: number;
  status: 'red' | 'yellow' | 'green';
  utilization: number;
  machineId: string;
  chartData: ChartData[];
}

const generateMockTimeSeries = (baseQueue: number, baseUtil: number, trend: 'up' | 'down' | 'stable'): ChartData[] => {
  const data: ChartData[] = [];
  const now = new Date();
  
  let currentQ = baseQueue;
  let currentU = baseUtil;
  
  for (let i = 24; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 5 * 60000); // 5 min intervals
    
    // Add some noise
    const noiseQ = Math.floor(Math.random() * 5) - 2;
    const noiseU = Math.random() * 4 - 2;
    
    // Apply trend
    if (trend === 'up') {
      currentQ = Math.max(0, currentQ + (i < 12 ? 1 : 0) + noiseQ);
      currentU = Math.min(100, Math.max(0, currentU + (i < 12 ? 0.5 : 0) + noiseU));
    } else if (trend === 'down') {
      currentQ = Math.max(0, currentQ - (i < 12 ? 1 : 0) + noiseQ);
      currentU = Math.min(100, Math.max(0, currentU - (i < 12 ? 0.5 : 0) + noiseU));
    } else {
      currentQ = Math.max(0, currentQ + noiseQ);
      currentU = Math.min(100, Math.max(0, currentU + noiseU));
    }
    
    data.push({
      time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      queue: Math.floor(currentQ),
      utilization: parseFloat(currentU.toFixed(1))
    });
  }
  
  return data;
};

export const stations: Station[] = [
  {
    id: 'station-a',
    name: 'Station A (CNC Milling)',
    currentQueue: 42,
    predictedQueue: 65,
    riskScore: 92,
    status: 'red',
    utilization: 98.5,
    machineId: 'MAC-8821',
    chartData: generateMockTimeSeries(25, 95, 'up')
  },
  {
    id: 'station-b',
    name: 'Station B (Welding Assembly)',
    currentQueue: 28,
    predictedQueue: 35,
    riskScore: 68,
    status: 'yellow',
    utilization: 82.0,
    machineId: 'WLD-042',
    chartData: generateMockTimeSeries(20, 80, 'up')
  },
  {
    id: 'station-c',
    name: 'Station C (Painting & Curing)',
    currentQueue: 12,
    predictedQueue: 10,
    riskScore: 24,
    status: 'green',
    utilization: 65.5,
    machineId: 'PNT-119',
    chartData: generateMockTimeSeries(15, 65, 'down')
  },
  {
    id: 'station-d',
    name: 'Station D (Quality QA)',
    currentQueue: 18,
    predictedQueue: 22,
    riskScore: 45,
    status: 'green',
    utilization: 71.2,
    machineId: 'QA-001',
    chartData: generateMockTimeSeries(18, 70, 'stable')
  }
];
