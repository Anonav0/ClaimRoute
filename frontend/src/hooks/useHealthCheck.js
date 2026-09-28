import { useState, useEffect, useCallback } from "react";
import { healthService } from "../services/health.service.js";

export function useHealthCheck(autoPoll = false, intervalMs = 10000) {
  const [status, setStatus] = useState("checking"); // 'checking' | 'connected' | 'error'
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const check = useCallback(async () => {
    setStatus((prev) => (prev === "connected" ? "connected" : "checking"));
    setError(null);
    try {
      const response = await healthService.checkHealth();
      setData(response);
      setStatus("connected");
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message || "Failed to reach backend");
      setStatus("error");
      setLastChecked(new Date().toLocaleTimeString());
    }
  }, []);

  useEffect(() => {
    check();

    if (!autoPoll) return;
    const timer = setInterval(check, intervalMs);
    return () => clearInterval(timer);
  }, [check, autoPoll, intervalMs]);

  return {
    status,
    data,
    error,
    lastChecked,
    refresh: check,
  };
}

export default useHealthCheck;
