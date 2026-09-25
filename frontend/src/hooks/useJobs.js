import { useCallback, useEffect, useRef, useState } from 'react';
import { apiService } from '../services/api';

// Poll while the tab is visible; refresh immediately when it becomes visible.
const usePolling = (callback, interval) => {
  const saved = useRef(callback);
  useEffect(() => { saved.current = callback; }, [callback]);

  useEffect(() => {
    const tick = () => { if (!document.hidden) saved.current(); };
    const id = setInterval(tick, interval);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [interval]);
};

/**
 * Server-paginated job list.
 * filters: { job_type, status, archived, q } · page is 1-based.
 */
export const useJobs = (filters = {}, { page = 1, pageSize = 20, interval = 3000 } = {}) => {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestId = useRef(0);
  const key = JSON.stringify(filters);

  const fetchJobs = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const data = await apiService.getJobs({ ...JSON.parse(key), limit: pageSize, offset: (page - 1) * pageSize });
      if (id !== requestId.current) return; // a newer request (filter/page change) won
      setJobs(data.jobs);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      if (id === requestId.current) setError(err.message || 'Failed to load jobs');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [key, page, pageSize]);

  useEffect(() => {
    setLoading(true);
    fetchJobs();
  }, [fetchJobs]);
  usePolling(fetchJobs, interval);

  return { jobs, total, pageCount: Math.max(1, Math.ceil(total / pageSize)), loading, error, refetch: fetchJobs };
};

export const useStats = (interval = 5000) => {
  const [stats, setStats] = useState(null);
  const fetchStats = useCallback(async () => {
    try {
      setStats(await apiService.getStats());
    } catch {
      // Stats are decorative; keep the last value on transient errors.
    }
  }, []);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  usePolling(fetchStats, interval);
  return { stats, refetch: fetchStats };
};

// Re-render periodically so relative times ("2 min ago") stay current.
export const useNow = (interval = 30000) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
};

// Reset to page 1 when the search text changes, debounced.
export const useDebounced = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
};
