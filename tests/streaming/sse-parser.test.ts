export async function runStreamingTests(server: any, assert: (cond: boolean, msg: string) => void) {
  console.log('\n--- SUITE: Streaming SSE Protocol Parsing ---');

  // Test OpenAI SSE Chunk processing logic
  const openAISSEChunks = [
    ': ping\n\n',
    'data: {"id":"chatcmpl-1","choices":[{"delta":{"role":"assistant"},"index":0}]}\n\n',
    'data: {"id":"chatcmpl-1","choices":[{"delta":{"content":"Hello"},"index":0}]}\n\n',
    'data: {"id":"chatcmpl-1","choices":[{"delta":{"content":" world"},"index":0}]}\n\n',
    'data: {"id":"chatcmpl-1","choices":[{"delta":{},"finish_reason":"stop","index":0}],"usage":{"prompt_tokens":10,"completion_tokens":2,"total_tokens":12}}\n\n',
    'data: [DONE]\n\n'
  ];

  let accumulated = '';
  let tokenCount = 0;
  let usageReceived = false;
  let finishReason = '';

  for (const chunk of openAISSEChunks) {
    const lines = chunk.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':') || trimmed === 'data: [DONE]') continue;
      if (trimmed.startsWith('data: ')) {
        const data = JSON.parse(trimmed.substring(6));
        if (data.usage) {
          usageReceived = true;
          assert(data.usage.total_tokens === 12, 'OpenAI SSE stream correctly extracted usage metrics');
        }
        if (data.choices?.[0]?.finish_reason) {
          finishReason = data.choices[0].finish_reason;
        }
        const delta = data.choices?.[0]?.delta?.content;
        if (delta) {
          accumulated += delta;
          tokenCount++;
        }
      }
    }
  }

  assert(accumulated === 'Hello world', 'Accumulated stream text matches expected string');
  assert(tokenCount === 2, 'Token events counted correctly');
  assert(usageReceived === true, 'Usage event detected in final stream chunk');
  assert(finishReason === 'stop', 'Finish reason stop correctly captured');

  // Test Reasoning Content (DeepSeek-R1 / Cerebras)
  const reasoningSSE = 'data: {"choices":[{"delta":{"reasoning_content":"Step 1: thinking..."}}]}\n\n';
  let reasoningExtracted = '';
  for (const line of reasoningSSE.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('data: ')) {
      const data = JSON.parse(trimmed.substring(6));
      const delta = data.choices?.[0]?.delta?.content || data.choices?.[0]?.delta?.reasoning_content;
      if (delta) reasoningExtracted += delta;
    }
  }
  assert(reasoningExtracted === 'Step 1: thinking...', 'Extracted reasoning_content from DeepSeek-R1 SSE format');

  // Test Anthropic SSE Events
  const anthropicSSE = [
    'event: message_start\ndata: {"type":"message_start","message":{"usage":{"input_tokens":25}}}\n\n',
    'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Claude response"}}\n\n',
    'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":8}}\n\n'
  ];

  let anthropicText = '';
  let anthropicInputTokens = 0;
  let anthropicOutputTokens = 0;
  let anthropicStopReason = '';

  for (const block of anthropicSSE) {
    for (const line of block.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ')) {
        const data = JSON.parse(trimmed.substring(6));
        if (data.type === 'message_start' && data.message?.usage) {
          anthropicInputTokens = data.message.usage.input_tokens;
        }
        if (data.type === 'message_delta') {
          if (data.usage) anthropicOutputTokens = data.usage.output_tokens;
          if (data.delta?.stop_reason) anthropicStopReason = data.delta.stop_reason;
        }
        if (data.type === 'content_block_delta' && data.delta?.text) {
          anthropicText += data.delta.text;
        }
      }
    }
  }

  assert(anthropicText === 'Claude response', 'Anthropic content_block_delta text extracted');
  assert(anthropicInputTokens === 25, 'Anthropic input tokens extracted from message_start');
  assert(anthropicOutputTokens === 8, 'Anthropic output tokens extracted from message_delta');
  assert(anthropicStopReason === 'end_turn', 'Anthropic stop_reason end_turn extracted');

  // Test Gemini SSE events
  const geminiSSE = 'data: {"candidates":[{"content":{"parts":[{"text":"Gemini stream output"}]},"finishReason":"STOP"}],"usageMetadata":{"promptTokenCount":15,"candidatesTokenCount":5,"totalTokenCount":20}}\n\n';
  let geminiText = '';
  let geminiTotalTokens = 0;
  let geminiFinishReason = '';

  for (const line of geminiSSE.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('data: ')) {
      const data = JSON.parse(trimmed.substring(6));
      if (data.usageMetadata) geminiTotalTokens = data.usageMetadata.totalTokenCount;
      const candidate = data.candidates?.[0];
      if (candidate?.finishReason) geminiFinishReason = candidate.finishReason;
      const parts = candidate?.content?.parts || [];
      geminiText += parts.map((p: any) => p.text || '').join('');
    }
  }

  assert(geminiText === 'Gemini stream output', 'Gemini candidate parts text extracted');
  assert(geminiTotalTokens === 20, 'Gemini usageMetadata totalTokenCount extracted');
  assert(geminiFinishReason === 'STOP', 'Gemini finishReason STOP extracted');

  // Test Thinking & Reasoning Separation
  const { parseThinking } = await server.ssrLoadModule('./src/utils/thinkingParser.ts');

  // 1. Direct thinking string
  const parsed1 = parseThinking('Final answer text', 'Step 1: internal thoughts');
  assert(parsed1.thinking === 'Step 1: internal thoughts', 'Direct thinking string captured properly');
  assert(parsed1.content === 'Final answer text', 'Output content retained without alteration');
  assert(parsed1.isThinking === false, 'isThinking is false when output content exists');

  // 2. Inline <think>...</think> tags
  const rawWithThink = '<think>\nFirst we evaluate 2 + 2.\nThe answer is 4.\n</think>\n\nHere is 4.';
  const parsed2 = parseThinking(rawWithThink);
  assert(parsed2.thinking === 'First we evaluate 2 + 2.\nThe answer is 4.', 'Inline <think> tags cleanly extracted into thinking');
  assert(parsed2.content === 'Here is 4.', 'Inline <think> tags completely removed from output');
  assert(parsed2.isThinking === false, 'Completed <think> tag sets isThinking to false');

  // 3. Streaming/unclosed <think> tag
  const streamingThink = '<think>\nEvaluating problem step 1...';
  const parsed3 = parseThinking(streamingThink);
  assert(parsed3.thinking === 'Evaluating problem step 1...', 'Streaming partial thoughts extracted');
  assert(parsed3.content === '', 'Content is empty during active thinking phase');
  assert(parsed3.isThinking === true, 'Unclosed <think> tag flags isThinking as true');

  // 4. Standard content without thinking
  const normalText = 'Hello there, how can I help you today?';
  const parsed4 = parseThinking(normalText);
  assert(parsed4.thinking === '', 'Non-reasoning model produces empty thinking');
  assert(parsed4.content === normalText, 'Standard model output untouched');
}
