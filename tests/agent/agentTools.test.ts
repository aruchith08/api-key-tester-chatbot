export async function runAgentToolsTests(server: any, assert: (cond: boolean, msg: string) => void) {
  console.log('\n--- SUITE: Autonomous Agent Tools & ReAct Harness ---');
  const {
    EXECUTE_PYTHON_TOOL_NAME,
    OPENAI_AGENT_TOOLS,
    ANTHROPIC_AGENT_TOOLS,
    GEMINI_AGENT_TOOLS,
    parseToolArguments
  } = await server.ssrLoadModule('./src/sandbox/agentTools.ts');

  const { OpenAICompatibleAdapter } = await server.ssrLoadModule('./src/providers/adapters/OpenAICompatibleAdapter.ts');
  const { PROVIDER_CATALOG } = await server.ssrLoadModule('./src/providers/catalog.ts');

  // 1. Tool schema integrity
  assert(EXECUTE_PYTHON_TOOL_NAME === 'execute_python', 'Tool name is execute_python');
  assert(OPENAI_AGENT_TOOLS.length === 1, 'OpenAI tool array contains 1 tool');
  assert(OPENAI_AGENT_TOOLS[0].type === 'function', 'OpenAI tool is type function');
  assert(OPENAI_AGENT_TOOLS[0].function.name === 'execute_python', 'OpenAI function name is execute_python');
  assert(OPENAI_AGENT_TOOLS[0].function.parameters.required.includes('code'), 'OpenAI parameters require code argument');

  assert(ANTHROPIC_AGENT_TOOLS.length === 1, 'Anthropic tool array contains 1 tool');
  assert(ANTHROPIC_AGENT_TOOLS[0].name === 'execute_python', 'Anthropic tool name is execute_python');
  assert(ANTHROPIC_AGENT_TOOLS[0].input_schema.required.includes('code'), 'Anthropic input_schema requires code argument');

  assert(GEMINI_AGENT_TOOLS.length === 1, 'Gemini tool array contains 1 declaration block');
  assert(GEMINI_AGENT_TOOLS[0].functionDeclarations[0].name === 'execute_python', 'Gemini declaration name is execute_python');
  assert(GEMINI_AGENT_TOOLS[0].functionDeclarations[0].parameters.required.includes('code'), 'Gemini parameters require code argument');

  // 2. parseToolArguments testing
  const objArgs = { code: 'import docx; doc = docx.Document()' };
  assert(parseToolArguments(objArgs).code === objArgs.code, 'parseToolArguments preserves object format');

  const jsonArgs = JSON.stringify({ code: 'print("Hello from sandbox")' });
  assert(parseToolArguments(jsonArgs).code === 'print("Hello from sandbox")', 'parseToolArguments parses valid JSON string');

  const stringifiedWithCode = '{"code": "with open(\'test.txt\', \'w\') as f: f.write(\'hi\')"}';
  assert(parseToolArguments(stringifiedWithCode).code?.includes('test.txt'), 'parseToolArguments handles nested escaped code');

  assert(parseToolArguments('').code === undefined, 'parseToolArguments handles empty string gracefully');

  // 3. Adapter tool messages formatting
  const groqDef = PROVIDER_CATALOG.find((p: any) => p.id === 'groq')!;
  const adapter = new OpenAICompatibleAdapter(groqDef);

  const testMessages = [
    { id: '1', role: 'user', content: 'Create a report docx', timestamp: Date.now() },
    {
      id: '2',
      role: 'assistant',
      content: 'Running the script...',
      tool_calls: [
        {
          id: 'call_999',
          type: 'function',
          function: { name: 'execute_python', arguments: '{"code":"doc.save(\'rep.docx\')"}' }
        }
      ],
      timestamp: Date.now()
    },
    {
      id: '3',
      role: 'tool',
      tool_call_id: 'call_999',
      content: 'Execution completed. Saved rep.docx (12 KB)',
      timestamp: Date.now()
    }
  ];

  const formatted = (adapter as any).formatMessages(testMessages);
  assert(formatted.length === 3, 'Formatted 3 conversation items including tool call & response');
  assert(formatted[1].role === 'assistant' && formatted[1].tool_calls?.[0].id === 'call_999', 'Assistant tool_calls preserved in formatMessages');
  assert(formatted[2].role === 'tool' && formatted[2].tool_call_id === 'call_999', 'Tool message properly mapped with tool_call_id');
  assert(formatted[2].content.includes('rep.docx'), 'Tool message content properly preserved');

  // 4. Mock streaming tool call SSE chunks
  const mockTransport = {
    async *stream() {
      yield 'data: {"id":"chatcmpl-1","choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_abc","function":{"name":"execute_python","arguments":"{\\"code\\": \\"import"}}]},"finish_reason":null}]}\n\n';
      yield 'data: {"id":"chatcmpl-1","choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":" docx\\"}"}}]},"finish_reason":null}]}\n\n';
      yield 'data: {"id":"chatcmpl-1","choices":[{"delta":{},"finish_reason":"tool_calls"}],"usage":{"prompt_tokens":15,"completion_tokens":25,"total_tokens":40}}\n\n';
      yield 'data: [DONE]\n\n';
    },
    async request() {
      throw new Error('Not implemented');
    }
  };

  const streamingAdapter = new OpenAICompatibleAdapter(groqDef, mockTransport as any);
  const stream = streamingAdapter.streamChat({
    apiKey: 'dummy',
    model: 'llama-3.3-70b-versatile',
    messages: testMessages,
    tools: OPENAI_AGENT_TOOLS
  });

  const receivedEvents: any[] = [];
  for await (const event of stream) {
    receivedEvents.push(event);
  }

  const deltaEvents = receivedEvents.filter(e => e.type === 'tool_call_delta');
  assert(deltaEvents.length >= 2, 'Received streaming tool_call_delta events');

  const toolCallsEvent = receivedEvents.find(e => e.type === 'tool_calls');
  assert(Boolean(toolCallsEvent), 'Received final aggregated tool_calls event');
  assert(toolCallsEvent.toolCalls[0].id === 'call_abc', 'Aggregated tool call ID matches');
  assert(toolCallsEvent.toolCalls[0].function.name === 'execute_python', 'Aggregated tool call function name matches');
  assert(toolCallsEvent.toolCalls[0].function.arguments === '{"code": "import docx"}', 'Aggregated tool call arguments joined accurately');

  const completeEvent = receivedEvents.find(e => e.type === 'complete');
  assert(completeEvent?.finishReason === 'tool_calls', 'Stream completion finishReason reflects tool_calls');
  assert(completeEvent?.toolCalls?.[0]?.id === 'call_abc', 'Complete event carries toolCalls');

  // 5. File Preview Drawer State in appStore
  const { useAppStore } = await server.ssrLoadModule('./src/store/appStore.ts');
  const store = useAppStore.getState();
  assert(store.previewFile === null, 'Initial previewFile is null');

  const dummyDocx = {
    name: 'quarterly_report.docx',
    url: 'blob:http://localhost/dummy-docx',
    size: 24500,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    createdAt: Date.now()
  };

  store.setPreviewFile(dummyDocx);
  assert(useAppStore.getState().previewFile?.name === 'quarterly_report.docx', 'setPreviewFile sets active preview file');

  const dummyXlsx = {
    name: 'budget.xlsx',
    url: 'blob:http://localhost/dummy-xlsx',
    size: 45000,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    createdAt: Date.now()
  };

  store.setPreviewFile(dummyXlsx);
  assert(useAppStore.getState().previewFile?.name === 'budget.xlsx', 'setPreviewFile updates to spreadsheet preview');

  store.setPreviewFile(null);
  assert(useAppStore.getState().previewFile === null, 'setPreviewFile(null) closes preview drawer');
}
