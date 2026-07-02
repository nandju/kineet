/**
 * useQueue Hook
 * Manages queue state and operations
 */

import { useState, useEffect, useCallback } from 'react';
import { QueueManager } from '../queue';
import { QueueStats, QueueTask } from '../types';

export function useQueue() {
  const [queueManager] = useState(() => new QueueManager());
  const [stats, setStats] = useState<QueueStats>({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  });
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    // Set up callbacks
    queueManager.setProgressCallback((taskId, status) => {
      updateStats();
    });

    queueManager.setCompletionCallback((taskId) => {
      updateStats();
    });

    queueManager.setErrorCallback((taskId, error) => {
      updateStats();
    });
  }, [queueManager]);

  const updateStats = useCallback(() => {
    setStats(queueManager.getStats());
    setIsRunning(queueManager['isRunning']);
  }, [queueManager]);

  const startQueue = useCallback(() => {
    queueManager.start();
    updateStats();
  }, [queueManager, updateStats]);

  const stopQueue = useCallback(() => {
    queueManager.stop();
    updateStats();
  }, [queueManager, updateStats]);

  const pauseQueue = useCallback(() => {
    queueManager.pause();
    updateStats();
  }, [queueManager, updateStats]);

  const resumeQueue = useCallback(() => {
    queueManager.resume();
    updateStats();
  }, [queueManager, updateStats]);

  const clearQueue = useCallback(() => {
    queueManager.clear();
    updateStats();
  }, [queueManager, updateStats]);

  const getTask = useCallback((taskId: string): QueueTask | undefined => {
    return queueManager.getTask(taskId);
  }, [queueManager]);

  const getAllTasks = useCallback((): QueueTask[] => {
    return queueManager.getAllTasks();
  }, [queueManager]);

  const retryTask = useCallback((taskId: string): boolean => {
    const success = queueManager.retryTask(taskId);
    if (success) {
      updateStats();
    }
    return success;
  }, [queueManager, updateStats]);

  const removeTask = useCallback((taskId: string): boolean => {
    const success = queueManager.removeTask(taskId);
    if (success) {
      updateStats();
    }
    return success;
  }, [queueManager, updateStats]);

  return {
    queueManager,
    stats,
    isRunning,
    startQueue,
    stopQueue,
    pauseQueue,
    resumeQueue,
    clearQueue,
    getTask,
    getAllTasks,
    retryTask,
    removeTask,
  };
}
