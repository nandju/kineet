/**
 * Queue Manager
 * Handles non-blocking task processing for campaign messages
 */

import { QueueTask, QueueStats, QueueConfig } from '../types';
import { IProvider } from '../providers';

export class QueueManager {
  private queue: Map<string, QueueTask> = new Map();
  private processing: Set<string> = new Set();
  private config: QueueConfig;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private provider: IProvider | null = null;
  private onProgress?: (taskId: string, status: string) => void;
  private onComplete?: (taskId: string) => void;
  private onError?: (taskId: string, error: string) => void;

  constructor(config?: Partial<QueueConfig>) {
    this.config = {
      maxConcurrent: config?.maxConcurrent || 5,
      retryDelay: config?.retryDelay || 1000,
      maxRetries: config?.maxRetries || 3,
    };
  }

  /**
   * Set the provider for sending messages
   */
  setProvider(provider: IProvider): void {
    this.provider = provider;
  }

  /**
   * Set progress callback
   */
  setProgressCallback(callback: (taskId: string, status: string) => void): void {
    this.onProgress = callback;
  }

  /**
   * Set completion callback
   */
  setCompletionCallback(callback: (taskId: string) => void): void {
    this.onComplete = callback;
  }

  /**
   * Set error callback
   */
  setErrorCallback(callback: (taskId: string, error: string) => void): void {
    this.onError = callback;
  }

  /**
   * Add a task to the queue
   */
  addTask(task: QueueTask): void {
    this.queue.set(task.id, task);
  }

  /**
   * Add multiple tasks to the queue
   */
  addTasks(tasks: QueueTask[]): void {
    tasks.forEach(task => this.addTask(task));
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): QueueTask | undefined {
    return this.queue.get(taskId);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): QueueTask[] {
    return Array.from(this.queue.values());
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    const tasks = this.getAllTasks();
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      processing: tasks.filter(t => t.status === 'processing').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
    };
  }

  /**
   * Start processing the queue
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.processQueue();
    }, 100);
  }

  /**
   * Stop processing the queue
   */
  stop(): void {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Pause processing (keeps running but doesn't process new tasks)
   */
  pause(): void {
    this.isRunning = false;
  }

  /**
   * Resume processing
   */
  resume(): void {
    if (!this.isRunning) {
      this.isRunning = true;
    }
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.stop();
    this.queue.clear();
    this.processing.clear();
  }

  /**
   * Process the queue (non-blocking)
   */
  private async processQueue(): Promise<void> {
    if (!this.isRunning || !this.provider) return;

    const stats = this.getStats();
    
    // Check if we can process more tasks
    if (stats.processing >= this.config.maxConcurrent) return;
    
    // Get pending tasks
    const pendingTasks = this.getAllTasks().filter(t => t.status === 'pending');
    
    if (pendingTasks.length === 0) {
      // Check if all tasks are completed
      if (stats.total > 0 && stats.pending === 0 && stats.processing === 0) {
        this.stop();
      }
      return;
    }

    // Process up to maxConcurrent tasks
    const tasksToProcess = pendingTasks.slice(0, this.config.maxConcurrent - stats.processing);
    
    for (const task of tasksToProcess) {
      this.processTask(task);
    }
  }

  /**
   * Process a single task
   */
  private async processTask(task: QueueTask): Promise<void> {
    // Mark as processing
    task.status = 'processing';
    task.startedAt = new Date();
    this.processing.add(task.id);
    this.queue.set(task.id, task);
    
    if (this.onProgress) {
      this.onProgress(task.id, 'processing');
    }

    try {
      // Send the message using the provider
      if (!this.provider) {
        throw new Error('Provider not configured');
      }
      const result = await this.provider.sendMessage(
        task.recipient.contact,
        task.canal === 'email' ? task.message : undefined,
        task.message
      );

      if (result.success) {
        // Task completed successfully
        task.status = 'completed';
        task.completedAt = new Date();
        this.processing.delete(task.id);
        this.queue.set(task.id, task);
        
        if (this.onComplete) {
          this.onComplete(task.id);
        }
      } else {
        // Task failed, retry if possible
        task.attempts++;
        
        if (task.attempts < task.maxAttempts) {
          // Retry later
          task.status = 'pending';
          this.processing.delete(task.id);
          this.queue.set(task.id, task);
          
          if (this.onProgress) {
            this.onProgress(task.id, 'retrying');
          }
          
          // Wait before retry
          await this.delay(this.config.retryDelay);
        } else {
          // Max retries reached, mark as failed
          task.status = 'failed';
          task.error = result.error || 'Unknown error';
          task.completedAt = new Date();
          this.processing.delete(task.id);
          this.queue.set(task.id, task);
          
          if (this.onError) {
            this.onError(task.id, task.error);
          }
        }
      }
    } catch (error) {
      // Unexpected error
      task.attempts++;
      task.error = error instanceof Error ? error.message : 'Unknown error';
      
      if (task.attempts < task.maxAttempts) {
        task.status = 'pending';
        this.processing.delete(task.id);
        this.queue.set(task.id, task);
      } else {
        task.status = 'failed';
        task.completedAt = new Date();
        this.processing.delete(task.id);
        this.queue.set(task.id, task);
        
        if (this.onError) {
          this.onError(task.id, task.error);
        }
      }
    }
  }

  /**
   * Retry a failed task
   */
  retryTask(taskId: string): boolean {
    const task = this.queue.get(taskId);
    if (!task || task.status !== 'failed') return false;
    
    task.status = 'pending';
    task.attempts = 0;
    task.error = undefined;
    this.queue.set(taskId, task);
    
    return true;
  }

  /**
   * Remove a task from the queue
   */
  removeTask(taskId: string): boolean {
    if (this.processing.has(taskId)) return false;
    
    return this.queue.delete(taskId);
  }

  /**
   * Get pending tasks for a specific campaign
   */
  getPendingTasksForCampaign(campaignId: string): QueueTask[] {
    return this.getAllTasks().filter(
      t => t.campaignId === campaignId && t.status === 'pending'
    );
  }

  /**
   * Get completed tasks for a specific campaign
   */
  getCompletedTasksForCampaign(campaignId: string): QueueTask[] {
    return this.getAllTasks().filter(
      t => t.campaignId === campaignId && t.status === 'completed'
    );
  }

  /**
   * Get failed tasks for a specific campaign
   */
  getFailedTasksForCampaign(campaignId: string): QueueTask[] {
    return this.getAllTasks().filter(
      t => t.campaignId === campaignId && t.status === 'failed'
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
