export interface ParsedMessageContent {
  thinking: string;
  content: string;
  isThinking: boolean;
}

/**
 * Extracts thinking/reasoning text and clean output text from message content.
 * Supports:
 * 1. Dedicated thinking strings passed directly via provider reasoning streams.
 * 2. Inline `<think>...</think>` or `<thought>...</thought>` tags (closed or currently streaming).
 */
export function parseThinking(rawContent: string = '', directThinking: string = ''): ParsedMessageContent {
  let thinking = (directThinking || '').trim();
  let content = rawContent || '';
  let isThinking = false;

  // Check for <think>...</think> or <thought>...</thought>
  const thinkPatterns = [
    { start: '<think>', end: '</think>' },
    { start: '<thought>', end: '</thought>' }
  ];

  for (const { start, end } of thinkPatterns) {
    const startIndex = content.indexOf(start);
    if (startIndex !== -1) {
      const endIndex = content.indexOf(end, startIndex + start.length);
      if (endIndex !== -1) {
        // Closed tag
        const extracted = content.substring(startIndex + start.length, endIndex).trim();
        thinking = thinking ? `${thinking}\n${extracted}` : extracted;
        content = (content.substring(0, startIndex) + content.substring(endIndex + end.length)).trimStart();
      } else {
        // Unclosed tag (model is actively streaming thinking)
        const extracted = content.substring(startIndex + start.length);
        thinking = thinking ? `${thinking}\n${extracted}` : extracted;
        content = content.substring(0, startIndex);
        isThinking = true;
      }
    }
  }

  // If there's direct thinking and content is empty while isThinking wasn't determined by tags
  if (directThinking && !content) {
    isThinking = true;
  }

  return {
    thinking: thinking.trim(),
    content: content.replace(/^\s*\n+/, ''), // Clean leading newlines left after removing think block
    isThinking
  };
}
