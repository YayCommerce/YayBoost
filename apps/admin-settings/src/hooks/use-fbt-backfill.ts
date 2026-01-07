/**
 * FBT Backfill Hook
 *
 * Manages the FBT backfill process with progress tracking.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fbtApi,
  FBTBackfillBatchResponse,
  FBTBackfillStartResponse,
  FBTBackfillStatusResponse,
} from '@/lib/api';

export interface BackfillState {
  isRunning: boolean;
  isPaused: boolean;
  total: number;
  processed: number;
  remaining: number;
  lastOrderId: number;
  batchSize: number;
  currentBatch: number;
  totalBatches: number;
  errors: number;
  error: string | null;
}

const initialState: BackfillState = {
  isRunning: false,
  isPaused: false,
  total: 0,
  processed: 0,
  remaining: 0,
  lastOrderId: 0,
  batchSize: 100,
  currentBatch: 0,
  totalBatches: 0,
  errors: 0,
  error: null,
};

// Query keys
export const fbtBackfillKeys = {
  status: ['fbt', 'backfill', 'status'] as const,
};

/**
 * Hook for managing FBT backfill process
 */
export function useFBTBackfill() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<BackfillState>(initialState);
  const abortRef = useRef(false);
  const isProcessingRef = useRef(false); // Track if currently processing a batch

  // Helper to reset processing flags
  const resetProcessingFlags = useCallback(() => {
    isProcessingRef.current = false;
  }, []);

  // Fetch current status
  const statusQuery = useQuery({
    queryKey: fbtBackfillKeys.status,
    queryFn: fbtApi.getStatus,
    refetchOnMount: true,
  });

  // Start backfill mutation
  const startMutation = useMutation({
    mutationFn: (batchSize: number) => fbtApi.startBackfill(batchSize),
    onSuccess: (data: FBTBackfillStartResponse) => {
      setState((prev) => ({
        ...prev,
        isRunning: true,
        isPaused: false,
        total: data.total,
        processed: 0,
        remaining: data.total,
        lastOrderId: 0,
        batchSize: data.batch_size,
        currentBatch: 0,
        totalBatches: data.batches_count,
        errors: 0,
        error: null,
      }));
      // Invalidate status query to refetch latest data
      queryClient.invalidateQueries({ queryKey: fbtBackfillKeys.status });
    },
    onError: (error: Error) => {
      setState((prev) => ({
        ...prev,
        isRunning: false,
        error: error.message,
      }));
    },
  });

  // Process batch mutation
  const processBatchMutation = useMutation({
    mutationFn: ({ batchSize, lastOrderId }: { batchSize: number; lastOrderId: number }) =>
      fbtApi.processBatch(batchSize, lastOrderId),
    onSuccess: (data: FBTBackfillBatchResponse) => {
      setState((prev) => {
        const newProcessed = prev.total - data.remaining;
        const isCompleted = data.completed || data.remaining <= 0;
        // Don't continue if paused/aborted
        const shouldContinue = !isCompleted && data.remaining > 0 && !abortRef.current;

        return {
          ...prev,
          processed: newProcessed,
          remaining: data.remaining,
          lastOrderId: data.last_order_id,
          currentBatch: prev.currentBatch + 1,
          isRunning: shouldContinue,
          errors: prev.errors + (data.errors || 0),
          error: null,
        };
      });
      queryClient.invalidateQueries({ queryKey: fbtBackfillKeys.status });
    },
    onError: (error: Error) => {
      setState((prev) => ({
        ...prev,
        isRunning: false,
        remaining: 0, // Set remaining to 0 to stop infinite loop
        error: error.message,
      }));
    },
  });

  // Process next batch
  const processNextBatch = useCallback(async () => {
    // Prevent concurrent processing or if already aborted
    if (isProcessingRef.current || abortRef.current) {
      if (abortRef.current) {
        setState((prev) => ({ ...prev, isRunning: false, isPaused: true }));
      }
      return;
    }

    // Check if should process
    if (!state.isRunning || state.isPaused || state.remaining <= 0) {
      return;
    }

    // Mark as processing
    isProcessingRef.current = true;

    // Process batch asynchronously
    processBatchMutation
      .mutateAsync({
        batchSize: state.batchSize,
        lastOrderId: state.lastOrderId,
      })
      .finally(() => {
        resetProcessingFlags();
      })
      .catch(() => {
        // Error already handled in mutation onError
      });
  }, [
    processBatchMutation,
    state.isRunning,
    state.isPaused,
    state.remaining,
    state.batchSize,
    state.lastOrderId,
    resetProcessingFlags,
  ]);

  // Auto-continue processing when running
  useEffect(() => {
    // Only trigger if all conditions are met and not already processing
    if (
      state.isRunning &&
      !state.isPaused &&
      state.remaining > 0 &&
      !state.error &&
      !abortRef.current &&
      !isProcessingRef.current
    ) {
      // Add small delay to prevent overwhelming the server
      const timeoutId = setTimeout(() => {
        processNextBatch();
      }, 300);

      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isRunning, state.isPaused, state.remaining, state.error, state.lastOrderId]);

  // Start backfill
  const start = useCallback(
    (batchSize: number) => {
      abortRef.current = false;
      resetProcessingFlags();
      startMutation.mutate(batchSize);
    },
    [startMutation, resetProcessingFlags],
  );

  // Pause backfill
  const pause = useCallback(() => {
    abortRef.current = true;
    resetProcessingFlags();
    setState((prev) => ({ ...prev, isPaused: true, isRunning: false }));
  }, [resetProcessingFlags]);

  // Resume backfill
  const resume = useCallback(() => {
    abortRef.current = false;
    resetProcessingFlags();
    setState((prev) => ({ ...prev, isPaused: false, isRunning: true }));
  }, [resetProcessingFlags]);

  // Calculate progress percentage
  const progress = state.total > 0 ? Math.round((state.processed / state.total) * 100) : 0;

  return {
    // State
    state,
    progress,
    isLoading: startMutation.isPending || processBatchMutation.isPending,
    isFetchingStatus: statusQuery.isLoading,

    // Status data from server
    statusData: statusQuery.data,

    // Actions
    start,
    pause,
    resume,

    // Refetch status
    refetchStatus: statusQuery.refetch,
  };
}
