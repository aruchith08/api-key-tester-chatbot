/**
 * Shared, robust Server-Sent Events (SSE) Parser.
 * Compliant with WHATWG SSE specification:
 * - Supports \n, \r\n, and \r line breaks
 * - Handles blank-line event boundaries
 * - Accurately captures final events even when streams close without a trailing newline
 * - Gracefully ignores comments (: ping) and captures [DONE]
 * - Accumulates fragmented chunks across network packets
 */

export interface SSEParsedEvent<T = any> {
  event?: string;
  data: string;
  parsedData?: T;
  id?: string;
  isDone?: boolean;
}

export class SSEParser {
  private buffer: string = '';

  /**
   * Appends incoming chunk data and returns all complete events parsed so far.
   */
  public feed(chunk: string): SSEParsedEvent[] {
    this.buffer += chunk;
    return this.drain(false);
  }

  /**
   * Flushes any remaining event data held in the buffer when the stream closes.
   * Ensures that trailing events without ending newlines are not lost.
   */
  public flush(): SSEParsedEvent[] {
    return this.drain(true);
  }

  /**
   * Resets internal buffer state.
   */
  public reset(): void {
    this.buffer = '';
  }

  private drain(isFinal: boolean): SSEParsedEvent[] {
    const events: SSEParsedEvent[] = [];

    // Normalize \r\n and \r to \n
    const normalized = this.buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized.split('\n');

    // If not final, the last item after the split might be incomplete
    if (!isFinal) {
      this.buffer = lines.pop() ?? '';
    } else {
      this.buffer = '';
    }

    let currentEventName: string | undefined;
    let currentId: string | undefined;
    const currentDataLines: string[] = [];

    const emitCurrent = () => {
      if (currentDataLines.length > 0) {
        const rawData = currentDataLines.join('\n');
        const trimmedData = rawData.trim();
        const isDone = trimmedData === '[DONE]';
        let parsedData: any = undefined;

        if (!isDone) {
          try {
            parsedData = JSON.parse(rawData);
          } catch {
            // Not JSON or partial JSON
          }
        }

        events.push({
          event: currentEventName,
          data: rawData,
          parsedData,
          id: currentId,
          isDone
        });

        currentDataLines.length = 0;
        currentEventName = undefined;
        currentId = undefined;
      }
    };

    for (const line of lines) {
      if (line === '') {
        // Blank line indicates event boundary
        emitCurrent();
        continue;
      }

      // Comment line (heartbeat/keepalive)
      if (line.startsWith(':')) {
        continue;
      }

      const colonIndex = line.indexOf(':');
      let field: string;
      let value: string;

      if (colonIndex === -1) {
        field = line;
        value = '';
      } else {
        field = line.slice(0, colonIndex);
        value = line.slice(colonIndex + 1);
        if (value.startsWith(' ')) {
          value = value.slice(1);
        }
      }

      switch (field) {
        case 'event':
          currentEventName = value;
          break;
        case 'data':
          currentDataLines.push(value);
          break;
        case 'id':
          currentId = value;
          break;
        default:
          // Ignore other fields
          break;
      }
    }

    // If this is the final flush and there are pending data lines, emit them
    if (isFinal) {
      emitCurrent();
    }

    return events;
  }
}
