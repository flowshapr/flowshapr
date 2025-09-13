# FlowShapr Streaming Flows Testapp

This testapp provides comprehensive testing for FlowShapr's streaming capabilities including Server-Sent Events (SSE) streaming, error handling, and performance scenarios.

## Purpose

Validates streaming functionality:
- Server-Sent Events (SSE) parsing and consumption
- Non-streaming response fallback behavior
- Stream error handling and recovery
- Timeout handling in long-running streams
- Authentication with streaming endpoints
- Large stream processing and buffering
- Malformed data handling and resilience

## Key Test Scenarios

### 1. Server-Sent Events Streaming
Tests proper SSE stream consumption:
- Multi-chunk data streaming
- Proper SSE data parsing (`data: ...` format)
- Stream termination handling (`[DONE]` marker)
- Chunk order preservation

### 2. Non-Streaming Fallback
Validates fallback to regular JSON responses:
- Detection of non-SSE content types
- Single chunk yielding for complete responses
- Proper content parsing

### 3. Error Handling
Tests streaming error scenarios:
- HTTP error status codes (4xx, 5xx)
- Error message extraction from responses
- Stream termination on errors
- Proper exception propagation

### 4. Timeout Handling
Validates timeout behavior:
- AbortSignal integration with streams
- Timeout error detection and handling
- Resource cleanup on timeouts

### 5. Authentication
Tests auth integration:
- Bearer token header transmission
- Accept header configuration for SSE
- Authenticated stream access

### 6. Large Stream Processing
Performance and reliability testing:
- High-volume chunk processing
- Memory management with large streams
- Stream ordering with many chunks

### 7. Resilience Testing
Error recovery and robustness:
- Malformed JSON chunk handling
- Partial data parsing
- Stream continuation after errors

## Usage

### Prerequisites

```bash
# Install dependencies
npm install

# Optional environment variables
export TEST_FLOW_ALIAS="streaming-flow"
export TEST_API_KEY="streaming-test-key"
```

### Running Tests

```bash
# Run all streaming tests
npm test

# Development mode with file watching
npm run dev

# Direct execution
npx tsx src/index.ts
```

## Configuration

Environment variables:
- `TEST_FLOW_ALIAS`: Flow alias for streaming tests (default: "streaming-test-flow")
- `TEST_API_KEY`: API key for authentication tests (default: "stream-test-key")

## Test Architecture

The testapp uses sophisticated mocking:

### Mock SSE Server
- **Custom ReadableStream**: Simulates Server-Sent Events
- **Controlled Timing**: Adds realistic delays between chunks
- **Format Compliance**: Proper SSE `data:` format
- **Termination Signals**: Uses `[DONE]` to end streams

### Error Simulation
- **HTTP Status Codes**: Tests various error conditions
- **Malformed Data**: Invalid JSON in stream chunks
- **Network Timeouts**: Infinite streams for timeout testing
- **Partial Responses**: Incomplete stream scenarios

## Expected Outcomes

All tests should pass, indicating:
- ✅ Proper SSE stream parsing and consumption
- ✅ Robust error handling across scenarios
- ✅ Reliable timeout and resource management
- ✅ Authentication integration with streaming
- ✅ Performance handling of large streams
- ✅ Resilience to malformed data

## Performance Considerations

The testapp validates:
- **Memory Usage**: No memory leaks with large streams
- **Backpressure**: Proper stream flow control
- **Resource Cleanup**: Reader lock management
- **Error Recovery**: Graceful handling of stream issues

## Debugging Stream Issues

Common failure patterns:
1. **SSE Parsing Errors**: Check `data:` prefix handling
2. **Timeout Issues**: Verify AbortSignal integration
3. **Memory Leaks**: Ensure reader.releaseLock() calls
4. **Authentication**: Validate Bearer token headers
5. **Content-Type**: Confirm `text/event-stream` detection

## CI/CD Integration

Include in continuous integration:

```bash
cd testapps/streaming-flows
npm install
npm test
```

Exit codes:
- `0`: All streaming tests passed
- `1`: Streaming functionality issues detected