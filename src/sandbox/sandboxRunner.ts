import type { GeneratedFile } from '../types/chat';

export interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  durationMs: number;
  files: GeneratedFile[];
  error?: string;
}

class SandboxRunner {
  private worker: Worker | null = null;
  private isInitializing: boolean = false;
  private pendingRuns = new Map<
    string,
    {
      resolve: (result: ExecutionResult) => void;
      reject: (err: any) => void;
      onProgress?: (msg: string) => void;
      timer: any;
    }
  >();

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('./pyodideWorker.ts', import.meta.url), {
        type: 'module'
      });

      this.worker.onmessage = (e: MessageEvent) => {
        const data = e.data;
        if (!data) return;

        if (data.type === 'STATUS') {
          // Broadcast progress message to the active running task
          for (const pending of this.pendingRuns.values()) {
            pending.onProgress?.(data.message);
          }
          return;
        }

        const id = data.id;
        const pending = this.pendingRuns.get(id);
        if (!pending) return;

        clearTimeout(pending.timer);
        this.pendingRuns.delete(id);

        if (data.type === 'SUCCESS') {
          // Convert binary files into browser Blob URLs
          const files: GeneratedFile[] = (data.files || []).map((f: any) => {
            const blob = new Blob([f.data], { type: f.mimeType });
            const url = URL.createObjectURL(blob);
            return {
              name: f.name,
              url,
              size: f.size,
              mimeType: f.mimeType,
              createdAt: Date.now()
            };
          });

          pending.resolve({
            success: true,
            stdout: data.stdout || '',
            stderr: data.stderr || '',
            durationMs: data.durationMs || 0,
            files
          });
        } else if (data.type === 'ERROR') {
          pending.resolve({
            success: false,
            stdout: data.stdout || '',
            stderr: data.stderr || '',
            durationMs: data.durationMs || 0,
            files: [],
            error: data.error || 'Execution failed'
          });
        }
      };

      this.worker.onerror = (err: ErrorEvent) => {
        console.error('Pyodide Worker Error:', err);
        for (const [id, pending] of this.pendingRuns.entries()) {
          clearTimeout(pending.timer);
          pending.resolve({
            success: false,
            stdout: '',
            stderr: err.message || 'Worker thread error',
            durationMs: 0,
            files: [],
            error: 'Web Worker runtime error. Please ensure your browser supports WebAssembly.'
          });
        }
        this.pendingRuns.clear();
        this.worker?.terminate();
        this.worker = null;
      };
    }

    return this.worker;
  }

  public async runPython(
    code: string,
    onProgress?: (statusMessage: string) => void,
    timeoutMs: number = 90000
  ): Promise<ExecutionResult> {
    const worker = this.getWorker();
    const id = 'exec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    return new Promise<ExecutionResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRuns.delete(id);
        resolve({
          success: false,
          stdout: '',
          stderr: `Execution timed out after ${timeoutMs / 1000} seconds.`,
          durationMs: timeoutMs,
          files: [],
          error: `Execution timed out after ${timeoutMs / 1000}s.`
        });
      }, timeoutMs);

      this.pendingRuns.set(id, {
        resolve,
        reject,
        onProgress,
        timer
      });

      onProgress?.('⚡ Preparing execution sandbox...');
      worker.postMessage({ type: 'RUN', id, code });
    });
  }

  public terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingRuns.clear();
  }
}

export const sandboxRunner = new SandboxRunner();
