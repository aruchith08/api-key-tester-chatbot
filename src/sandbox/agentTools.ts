/**
 * In-browser Agent Tool Definitions
 * 
 * Provides standardized tool schemas for client-side autonomous sandbox execution.
 */

export const EXECUTE_PYTHON_TOOL_NAME = 'execute_python';

export const EXECUTE_PYTHON_DESCRIPTION =
  'Executes Python code in an isolated client-side WebAssembly sandbox with an in-memory virtual filesystem. ' +
  'Supports libraries: docx (python-docx), openpyxl, pandas, matplotlib, reportlab, pydantic, sympy. ' +
  'Any files written to disk (e.g. doc.save("output.docx"), plt.savefig("chart.png"), or open("data.csv", "w")) ' +
  'are automatically extracted as downloadable files for the user. Prints (stdout) and errors (stderr) are captured.';

/**
 * OpenAI / OpenAI-Compatible Tool Schema
 */
export const OPENAI_AGENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: EXECUTE_PYTHON_TOOL_NAME,
      description: EXECUTE_PYTHON_DESCRIPTION,
      parameters: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'The complete executable Python script to run in the sandbox.'
          }
        },
        required: ['code']
      }
    }
  }
];

/**
 * Anthropic Claude Tool Schema
 */
export const ANTHROPIC_AGENT_TOOLS = [
  {
    name: EXECUTE_PYTHON_TOOL_NAME,
    description: EXECUTE_PYTHON_DESCRIPTION,
    input_schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The complete executable Python script to run in the sandbox.'
        }
      },
      required: ['code']
    }
  }
];

/**
 * Google Gemini Tool Schema
 */
export const GEMINI_AGENT_TOOLS = [
  {
    functionDeclarations: [
      {
        name: EXECUTE_PYTHON_TOOL_NAME,
        description: EXECUTE_PYTHON_DESCRIPTION,
        parameters: {
          type: 'OBJECT',
          properties: {
            code: {
              type: 'STRING',
              description: 'The complete executable Python script to run in the sandbox.'
            }
          },
          required: ['code']
        }
      }
    ]
  }
];

/**
 * Safely parses tool arguments from the model output.
 */
export function parseToolArguments(rawArgs: string | Record<string, any>): { code?: string; [key: string]: any } {
  if (typeof rawArgs === 'object' && rawArgs !== null) {
    return rawArgs;
  }

  if (typeof rawArgs !== 'string') {
    return {};
  }

  const trimmed = rawArgs.trim();
  if (!trimmed) return {};

  try {
    return JSON.parse(trimmed);
  } catch {
    // If partial JSON or escaped string
    try {
      const match = trimmed.match(/"code"\s*:\s*"([\s\S]*)"/);
      if (match && match[1]) {
        return { code: JSON.parse(`"${match[1]}"`) };
      }
    } catch {
      // Fallback
    }
    return { code: trimmed };
  }
}
