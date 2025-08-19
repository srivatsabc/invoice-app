export const API_BASE_URL = 'http://localhost:8088/api/v3';
export const PROCESS_MANAGEMENT_BASE_URL = 'http://localhost:8099/api/v3';

export const API_ENDPOINTS = {
  DASHBOARD: `${API_BASE_URL}/invoice-management/dashboard`,
  DASHBOARD_FILTER: `${API_BASE_URL}/invoice-management/dashboard/filter`,
  SEARCH_INVOICES: `${API_BASE_URL}/invoice-management`,
  SEARCH_INVOICES_RESULTS: `${API_BASE_URL}/invoice-management/search-invoices`,
  SQL_AGENT: `${API_BASE_URL}/invoice-management/sql-agent`,
  REGIONS_COUNTRIES: `${API_BASE_URL}/regions-management/regions-countries`,
  COUNTRIES_TO_BRANDS: `${API_BASE_URL}/prompt-registry/countries-to-brands`,
  PROMPT_TEMPLATES: `${API_BASE_URL}/prompt-registry/countries`,
  AGENT_CONTROLS: `${API_BASE_URL}/agent-control/controls`,
  AGENT_CONTROLS_DEBUG: `${API_BASE_URL}/agent-control/controls/logging`,
  AGENT_CONTROLS_INVOICE_PROCESSING: `${API_BASE_URL}/agent-control/invoice_processing`,
  AGENT_LOGS: `${API_BASE_URL}/agent-logs`,
  PROCESS_INVOICE: `${PROCESS_MANAGEMENT_BASE_URL}/process-management/process-invoice`
};

// Login credentials
export const LOGIN_CREDENTIALS = {
  VALID_PASSWORD: 'g77o-5K@F>>/21$X^~mFZ2Q2>hv#`S4[9Wi'
};