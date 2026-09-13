export async function runCodeDetectorTests(server: any, assert: (cond: boolean, msg: string) => void) {
  console.log('\n--- SUITE: Python Code Detector & File Generation Heuristics ---');

  const {
    hasFileGenerationCode,
    extractPythonCodeBlocks,
    findExecutableFileScript
  } = await server.ssrLoadModule('./src/utils/codeDetector.ts');

  // 1. Detection of file saving patterns
  assert(hasFileGenerationCode('doc.save("sample.docx")'), 'Detected docx doc.save() pattern');
  assert(hasFileGenerationCode('workbook.save("financials.xlsx")'), 'Detected openpyxl workbook.save() pattern');
  assert(hasFileGenerationCode('plt.savefig("chart.png", dpi=300)'), 'Detected matplotlib plt.savefig() pattern');
  assert(hasFileGenerationCode('df.to_csv("export.csv", index=False)'), 'Detected pandas df.to_csv() pattern');
  assert(hasFileGenerationCode('df.to_excel("sheet.xlsx")'), 'Detected pandas df.to_excel() pattern');
  assert(hasFileGenerationCode('with open("output.txt", "w") as f:\n    f.write("test")'), 'Detected with open(..., "w") pattern');
  assert(hasFileGenerationCode('doc = SimpleDocTemplate("output.pdf")'), 'Detected reportlab SimpleDocTemplate pattern');

  // 2. Rejection of standard non-file scripts
  assert(!hasFileGenerationCode('print("Hello world")'), 'Rejects pure print statement without file generation');
  assert(!hasFileGenerationCode('def add(a, b):\n    return a + b'), 'Rejects helper function without file generation');
  assert(!hasFileGenerationCode('import numpy as np\narr = np.array([1, 2, 3])\nprint(arr.mean())'), 'Rejects standard calculation without file generation');

  // 3. Extraction from Markdown
  const markdownSample = `
Here is a script to generate a word document:

\`\`\`python
import docx
doc = docx.Document()
doc.add_heading("Hello World", 0)
doc.save("hello.docx")
\`\`\`

And here is a bash command you can use:
\`\`\`bash
ls -la
\`\`\`
`;

  const blocks = extractPythonCodeBlocks(markdownSample);
  assert(blocks.length === 1, 'Extracted exactly 1 Python block from mixed markdown');
  assert(blocks[0].hasFileGeneration === true, 'Identified file generation flag in extracted block');
  assert(blocks[0].code.includes('doc.save("hello.docx")'), 'Preserved python code content exactly');

  const executable = findExecutableFileScript(markdownSample);
  assert(executable !== null && executable.includes('hello.docx'), 'findExecutableFileScript resolves target python script');

  const nonFileMarkdown = `
\`\`\`python
print("Just testing math:")
x = 10 * 5
print(x)
\`\`\`
`;
  assert(findExecutableFileScript(nonFileMarkdown) === null, 'findExecutableFileScript returns null when no files are saved');
}
