/**
 * useApi.js
 * Thin axios wrapper that talks to the FastAPI backend.
 * All hooks return { data, loading, error } and a refetch function.
 */
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export const api = axios.create({ baseURL: BASE, timeout: 30_000 });

function useQuery(url, deps = []) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(url);
      setData(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useEffect(() => { fetch(); }, [fetch, ...deps]);
  return { data, loading, error, refetch: fetch };
}

export function useHealth(repoUrl) {
  const qs = repoUrl ? `?repo_url=${encodeURIComponent(repoUrl)}` : '';
  return useQuery(`/health${qs}`, [repoUrl]);
}

export function useQuantumRisk(repoUrl) {
  const qs = repoUrl ? `?repo_url=${encodeURIComponent(repoUrl)}` : '';
  return useQuery(`/quantum-risk${qs}`, [repoUrl]);
}

export function useSimulationFiles() {
  return useQuery('/simulation/files');
}

export async function runSimulation(changedFile) {
  const res = await api.post('/simulation', { changed_file: changedFile });
  return res.data;
}

export async function triggerAnalysis(repoUrl, useMock = true) {
  const res = await api.post('/analyze', { repo_url: repoUrl, use_mock: useMock });
  return res.data;
}
