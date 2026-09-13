/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope;

interface RunMessage {
  type: 'RUN';
  id: string;
  code: string;
}

interface OutFile {
  name: string;
  data: Uint8Array;
  size: number;
  mimeType: string;
}

let pyodideInstance: any = null;
let micropipInstance: any = null;
const loadedPackages = new Set<string>();

const CWD = '/home/pyodide';

const MIME_MAP: Record<string, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  svg: 'image/svg+xml',
  csv: 'text/csv',
  tsv: 'text/tab-separated-values',
  json: 'application/json',
  txt: 'text/plain',
  html: 'text/html',
  zip: 'application/zip',
  parquet: 'application/octet-stream'
};

function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return MIME_MAP[ext] || 'application/octet-stream';
}

function detectRequiredPackages(code: string): { builtin: string[]; micropip: string[] } {
  const builtin: string[] = [];
  const micropip: string[] = [];

  const checks: { pattern: RegExp; name: string; isBuiltin: boolean }[] = [
    { pattern: /\b(import\s+docx|from\s+docx)\b/, name: 'python-docx', isBuiltin: false },
    { pattern: /\b(import\s+openpyxl|from\s+openpyxl)\b/, name: 'openpyxl', isBuiltin: false },
    { pattern: /\b(import\s+reportlab|from\s+reportlab)\b/, name: 'reportlab', isBuiltin: false },
    { pattern: /\b(import\s+matplotlib|from\s+matplotlib|import\s+pyplot|import\s+plt)\b/, name: 'matplotlib', isBuiltin: true },
    { pattern: /\b(import\s+pandas|from\s+pandas|import\s+pd)\b/, name: 'pandas', isBuiltin: true },
    { pattern: /\b(import\s+numpy|from\s+numpy|import\s+np)\b/, name: 'numpy', isBuiltin: true },
    { pattern: /\b(import\s+scipy|from\s+scipy)\b/, name: 'scipy', isBuiltin: true },
    { pattern: /\b(import\s+PIL|from\s+PIL|import\s+pillow)\b/, name: 'pillow', isBuiltin: true },
    { pattern: /\b(import\s+sympy|from\s+sympy)\b/, name: 'sympy', isBuiltin: true },
  ];

  for (const check of checks) {
    if (check.pattern.test(code) && !loadedPackages.has(check.name)) {
      if (check.isBuiltin) {
        builtin.push(check.name);
      } else {
        micropip.push(check.name);
      }
    }
  }

  return { builtin, micropip };
}

async function getPyodide() {
  if (pyodideInstance) return pyodideInstance;

  self.postMessage({ type: 'STATUS', message: '⚡ Loading Pyodide WebAssembly runtime...' });

  const pyodideModule = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.mjs');
  pyodideInstance = await pyodideModule.loadPyodide({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/'
  });

  // Ensure working directory is setup
  try {
    pyodideInstance.FS.mkdirTree(CWD);
  } catch {}
  try {
    pyodideInstance.FS.chdir(CWD);
  } catch {}

  return pyodideInstance;
}

function getDirStats(pyodide: any): Map<string, { size: number; mtime: number }> {
  const map = new Map<string, { size: number; mtime: number }>();
  try {
    const entries: string[] = pyodide.FS.readdir(CWD);
    for (const name of entries) {
      if (name === '.' || name === '..' || name.startsWith('.')) continue;
      try {
        const fullPath = `${CWD}/${name}`;
        const stat = pyodide.FS.stat(fullPath);
        if (pyodide.FS.isFile(stat.mode)) {
          map.set(name, { size: stat.size, mtime: stat.mtime instanceof Date ? stat.mtime.getTime() : Number(stat.mtime) });
        }
      } catch {}
    }
  } catch {}
  return map;
}

self.onmessage = async (e: MessageEvent<RunMessage>) => {
  const { type, id, code } = e.data;
  if (type !== 'RUN') return;

  const startTime = Date.now();
  let stdout = '';
  let stderr = '';

  try {
    const pyodide = await getPyodide();

    // 1. Detect & install dependencies
    const { builtin, micropip } = detectRequiredPackages(code);

    if (builtin.length > 0) {
      self.postMessage({ type: 'STATUS', message: `📦 Loading packages (${builtin.join(', ')})...` });
      await pyodide.loadPackage(builtin);
      builtin.forEach((pkg) => loadedPackages.add(pkg));
    }

    if (micropip.length > 0) {
      if (!micropipInstance) {
        self.postMessage({ type: 'STATUS', message: '📦 Initializing micropip package installer...' });
        await pyodide.loadPackage('micropip');
        micropipInstance = pyodide.pyimport('micropip');
      }

      self.postMessage({ type: 'STATUS', message: `📦 Installing pure-python wheels (${micropip.join(', ')})...` });
      await micropipInstance.install(micropip);
      micropip.forEach((pkg) => loadedPackages.add(pkg));
    }

    // 2. Setup stdout/stderr capturing
    pyodide.setStdout({
      batched: (msg: string) => {
        stdout += msg + '\n';
        self.postMessage({ type: 'STDOUT', text: msg });
      }
    });

    pyodide.setStderr({
      batched: (msg: string) => {
        stderr += msg + '\n';
        self.postMessage({ type: 'STDERR', text: msg });
      }
    });

    // 3. Snapshot filesystem state before execution
    const beforeStats = getDirStats(pyodide);

    self.postMessage({ type: 'STATUS', message: '⚡ Executing Python code in sandbox...' });

    // 4. Run Python code
    await pyodide.runPythonAsync(code);

    // 5. Detect and extract generated files from virtual filesystem
    self.postMessage({ type: 'STATUS', message: '📦 Extracting generated files from virtual filesystem...' });
    const afterStats = getDirStats(pyodide);
    const files: OutFile[] = [];
    const transferBuffers: ArrayBuffer[] = [];

    for (const [name, stat] of afterStats.entries()) {
      const before = beforeStats.get(name);
      // If file is new or modified
      if (!before || stat.mtime > before.mtime || stat.size !== before.size) {
        try {
          const filePath = `${CWD}/${name}`;
          const data: Uint8Array = pyodide.FS.readFile(filePath, { encoding: 'binary' });
          files.push({
            name,
            data,
            size: data.byteLength,
            mimeType: getMimeType(name)
          });
          transferBuffers.push(data.buffer as ArrayBuffer);
        } catch (readErr) {
          console.error('Failed to read virtual file:', name, readErr);
        }
      }
    }

    const durationMs = Date.now() - startTime;

    self.postMessage(
      {
        type: 'SUCCESS',
        id,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        files,
        durationMs
      },
      // @ts-ignore Transferable buffer array
      transferBuffers
    );

  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    self.postMessage({
      type: 'ERROR',
      id,
      error: err?.message || String(err),
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      durationMs
    });
  }
};
