export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export const endpoints = {
  health: '/api/health',
  schema: '/api/schema',
  integrationsStatus: '/api/integrations/status',
  routes: '/api/routes',
  runs: '/api/runs',
  run: (runId: string) => `/api/runs/${encodeURIComponent(runId)}`,
  runReport: (runId: string) => `/api/runs/${encodeURIComponent(runId)}/report.csv`,
  runReportPdf: (runId: string) => `/api/runs/${encodeURIComponent(runId)}/report.pdf`,
}
