import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../services/api';

export const useJobs = (filters = {}, autoRefresh = true, refreshInterval = 5000) => {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use ref to store filters to avoid infinite loops
  const filtersRef = useRef(filters);

  // Update ref when filters change
  useEffect(() => {
    filtersRef.current = filters;
  }, [JSON.stringify(filters)]);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getJobs(filtersRef.current);
      setJobs(data.jobs);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();

    if (autoRefresh) {
      const interval = setInterval(fetchJobs, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchJobs, autoRefresh, refreshInterval]);

  return { jobs, total, loading, error, refetch: fetchJobs };
};

export const useJob = (jobId, autoRefresh = true, refreshInterval = 5000) => {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shouldStopPolling, setShouldStopPolling] = useState(false);

  const fetchJob = useCallback(async () => {
    if (!jobId) return false;

    try {
      const data = await apiService.getJob(jobId);
      setJob(data);
      setError(null);

      // Stop auto-refresh if job is completed or failed
      if (data.status === 'completed' || data.status === 'failed') {
        setShouldStopPolling(true);
        return true;
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch job');
    } finally {
      setLoading(false);
    }

    return false;
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;

    setShouldStopPolling(false);
    fetchJob();

    if (autoRefresh && !shouldStopPolling) {
      const interval = setInterval(() => {
        if (!shouldStopPolling) {
          fetchJob();
        }
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [jobId, fetchJob, autoRefresh, refreshInterval, shouldStopPolling]);

  return { job, loading, error, refetch: fetchJob };
};
