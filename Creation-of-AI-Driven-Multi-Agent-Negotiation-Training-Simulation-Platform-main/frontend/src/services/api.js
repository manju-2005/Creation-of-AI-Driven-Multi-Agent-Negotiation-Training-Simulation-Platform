import axios from 'axios';

const API_BASE = '/api';

export const api = {
  getScenarios: async () => {
    const res = await axios.get(`${API_BASE}/scenarios`);
    return res.data;
  },

  getTools: async () => {
    const res = await axios.get(`${API_BASE}/tools`);
    return res.data;
  },

  createSession: async (sessionPayload) => {
    const res = await axios.post(`${API_BASE}/sessions`, sessionPayload);
    return res.data;
  },

  getSession: async (sessionId) => {
    const res = await axios.get(`${API_BASE}/sessions/${sessionId}`);
    return res.data;
  },

  submitTurn: async (sessionId, turnPayload = null) => {
    const res = await axios.post(`${API_BASE}/sessions/${sessionId}/turns`, turnPayload);
    return res.data;
  },

  getTurns: async (sessionId) => {
    const res = await axios.get(`${API_BASE}/sessions/${sessionId}/turns`);
    return res.data;
  },

  getMetrics: async (sessionId) => {
    const res = await axios.get(`${API_BASE}/sessions/${sessionId}/metrics`);
    return res.data;
  },

  getAgentMemory: async (sessionId, role = 'interviewer') => {
    const res = await axios.get(`${API_BASE}/sessions/${sessionId}/memory?role=${role}`);
    return res.data;
  },

  getReport: async (sessionId) => {
    const res = await axios.get(`${API_BASE}/sessions/${sessionId}/report`);
    return res.data;
  },

  listSessions: async () => {
    const res = await axios.get(`${API_BASE}/sessions`);
    return res.data;
  },

  deleteSession: async (sessionId) => {
    const res = await axios.delete(`${API_BASE}/sessions/${sessionId}`);
    return res.data;
  }
};
