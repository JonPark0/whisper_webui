import axios from 'axios';

// Empty = same origin: the browser calls /api/... on whatever host served the
// page (localhost, a LAN IP, a hostname) and the Vite dev server proxies it to
// the backend. Set VITE_API_URL only when the API lives on another origin.
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API functions
export const apiService = {
  // Health check
  async healthCheck() {
    const response = await api.get('/');
    return response.data;
  },

  // STT engine / enhancer description (drives labels and available options)
  async getInfo() {
    const response = await api.get('/api/info');
    return response.data;
  },

  // Upload audio file
  async uploadAudio(file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });

    return response.data;
  },

  // Create transcription job
  async createTranscribeJob(filename, options) {
    const response = await api.post(`/api/transcribe?filename=${encodeURIComponent(filename)}`, options);
    return response.data;
  },

  // Create enhancement job
  async createEnhanceJob(jobId, options) {
    const response = await api.post('/api/enhance', {
      job_id: jobId,
      ...options,
    });
    return response.data;
  },

  // Get all jobs
  async getJobs(filters = {}) {
    const params = new URLSearchParams();

    if (filters.job_type) params.append('job_type', filters.job_type);
    if (filters.status) params.append('status', filters.status);
    if (filters.archived !== undefined) params.append('archived', filters.archived);
    if (filters.q) params.append('q', filters.q);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);

    const response = await api.get(`/api/jobs?${params.toString()}`);
    return response.data;
  },

  // Queue counts for the page header
  async getStats() {
    const response = await api.get('/api/stats');
    return response.data;
  },

  // Get single job
  async getJob(jobId) {
    const response = await api.get(`/api/jobs/${jobId}`);
    return response.data;
  },

  // Get job result content
  async getJobResult(jobId) {
    const response = await api.get(`/api/jobs/${jobId}/result`);
    return response.data;
  },

  // Download job result
  async downloadResult(jobId) {
    const response = await api.get(`/api/jobs/${jobId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Delete job
  async deleteJob(jobId) {
    const response = await api.delete(`/api/jobs/${jobId}`);
    return response.data;
  },

  // Archive job
  async archiveJob(jobId) {
    const response = await api.put(`/api/jobs/${jobId}/archive`);
    return response.data;
  },

  // Unarchive job
  async unarchiveJob(jobId) {
    const response = await api.put(`/api/jobs/${jobId}/unarchive`);
    return response.data;
  },
};

export default api;
