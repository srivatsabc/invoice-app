// API endpoints for incident analysis and live incidents
export const INCIDENT_API_BASE_URL = 'https://apimaznazone1dev04-ena3aegrf4ffcte3.eastus-01.azurewebsites.net/api/v1';

export const INCIDENT_API_ENDPOINTS = {
  // Analyse Incidents endpoints
  CATEGORIZATION_UPLOAD: `${INCIDENT_API_BASE_URL}/categorization/upload-excel`,
  CATEGORIZATION_WS: `wss://apimaznazone1dev04-ena3aegrf4ffcte3.eastus-01.azurewebsites.net/api/v1/categorization/ws`,
  
  // Live Incidents endpoints  
  LIVE_INCIDENTS_ANALYTICS: `${INCIDENT_API_BASE_URL}/live-incidents/analytics`,
  
  // Chatbot endpoints
  SQL_AGENT: `${INCIDENT_API_BASE_URL}/invoice-management/sql-agent`,
  INCIDENT_ANALYTICS_AGENT: `${INCIDENT_API_BASE_URL}/incident-analytics-agent/query`
};