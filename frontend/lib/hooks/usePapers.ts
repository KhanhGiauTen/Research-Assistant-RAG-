"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import type { IngestJob, PaperInfo } from "@/lib/types";

export function usePapers() {
  const [papers, setPapers] = useState<PaperInfo[]>([]);
  const [totalChunks, setTotalChunks] = useState(0);
  const [job, setJob] = useState<IngestJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    const response = await api.listPapers();
    setPapers(response.files);
    setTotalChunks(response.total_chunks);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollJob = useCallback(
    (jobId: string) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const status = await api.getJobStatus(jobId);
          setJob(status);
          if (status.status !== "processing") {
            stopPolling();
            await refresh();
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to poll job");
          stopPolling();
        }
      }, 1500);
    },
    [refresh, stopPolling],
  );

  const upload = useCallback(
    async (files: File[]) => {
      if (!files.length) {
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.uploadPapers(files);
        setJob(response);
        pollJob(response.job_id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setIsLoading(false);
      }
    },
    [pollJob],
  );

  const remove = useCallback(
    async (fileName: string) => {
      setError(null);
      try {
        await api.deletePaper(fileName);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
      }
    },
    [refresh],
  );

  useEffect(() => {
    refresh().catch((err) => {
      setError(err instanceof Error ? err.message : "Cannot load papers");
    });
    return stopPolling;
  }, [refresh, stopPolling]);

  return {
    papers,
    totalChunks,
    job,
    isLoading,
    error,
    refresh,
    upload,
    remove,
  };
}
