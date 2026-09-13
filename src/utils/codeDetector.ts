export interface DetectedCodeBlock {
  language: string;
  code: string;
  hasFileGeneration: boolean;
}

const FILE_GENERATION_PATTERNS = [
  /\b\w+\.save\s*\(/i,                   // doc.save(), wb.save(), image.save()
  /\b(plt|fig|figure)\.savefig\s*\(/i,   // plt.savefig(), fig.savefig()
  /\bsavefig\s*\(/i,                     // savefig(...)
  /\b\w+\.to_(csv|excel|json|parquet|feather|html)\s*\(/i, // df.to_csv(), df.to_excel()
  /\bopen\s*\([^)]*,\s*['"][wa]\+?b?['"]\s*\)/i,           // open('file.ext', 'w' / 'wb')
  /\bwith\s+open\s*\([^)]*,\s*['"][wa]\+?b?['"]\s*\)/i,    // with open('file.ext', 'w')
  /\b(Path|pathlib)\([^)]*\)\.write_(bytes|text)\s*\(/i,    // Path('file').write_bytes()
  /\bSimpleDocTemplate\s*\(/i,           // ReportLab PDF
  /\bcanvas\.Canvas\s*\(/i,              // ReportLab canvas
  /\bpdf\.output\s*\(/i,                 // FPDF output
  /\bZipFile\s*\([^)]*,\s*['"]w['"]\s*\)/i // zipfile.ZipFile(..., 'w')
];

/**
 * Checks if a snippet of Python code contains file creation/saving operations.
 */
export function hasFileGenerationCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  return FILE_GENERATION_PATTERNS.some((pattern) => pattern.test(code));
}

/**
 * Parses markdown to extract Python code blocks and evaluates whether they generate files.
 */
export function extractPythonCodeBlocks(markdown: string): DetectedCodeBlock[] {
  if (!markdown || typeof markdown !== 'string') return [];

  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\s*\n([\s\S]*?)```/g;
  const blocks: DetectedCodeBlock[] = [];
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    const lang = (match[1] || '').trim().toLowerCase();
    const code = (match[2] || '').trim();

    // Check if block is python or python-like
    const isPython = ['python', 'py', 'python3'].includes(lang) || (!lang && (code.includes('import ') || code.includes('def ') || code.includes('print(')));

    if (isPython && code) {
      blocks.push({
        language: lang || 'python',
        code,
        hasFileGeneration: hasFileGenerationCode(code)
      });
    }
  }

  return blocks;
}

/**
 * Finds the first executable Python script that creates a file.
 */
export function findExecutableFileScript(markdown: string): string | null {
  const blocks = extractPythonCodeBlocks(markdown);
  const fileBlock = blocks.find((b) => b.hasFileGeneration);
  return fileBlock ? fileBlock.code : null;
}
