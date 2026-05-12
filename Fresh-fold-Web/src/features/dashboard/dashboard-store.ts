import { create } from 'zustand'

export type ChartPeriod = 'daily' | 'weekly' | 'monthly'

type DashboardUiState = {
  chartPeriod: ChartPeriod
  setChartPeriod: (period: ChartPeriod) => void
}

export const useDashboardStore = create<DashboardUiState>((set) => ({
  chartPeriod: 'daily',
  setChartPeriod: (chartPeriod) => set({ chartPeriod }),
}))
