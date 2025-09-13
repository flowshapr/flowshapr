# FlowShapr Official SDK Basic Testapp

This testapp provides comprehensive integration tests for the official FlowShapr SDK (`@flowshapr/client`) basic functionality.

## Purpose

Tests core official FlowShapr SDK features including:
- Flow execution via aliases using `FlowshaprClient`
- Authentication handling with API keys
- Error scenarios and wrapped response format
- Local vs production environments
- AbortSignal/timeout configuration
- Wrapped response format (`{success, result, error}`)
- Request format validation (`{input: ...}`)

## Usage

### Prerequisites

```bash
# Set environment variables (optional)
export TEST_FLOW_ALIAS="your-test-flow"
export TEST_API_KEY="your-test-api-key"
```

### Running Tests

```bash
# Install dependencies
npm install

# Run tests
npm test

# Or run directly with tsx
npx tsx src/index.ts

# Development mode with watch
npm run dev
```

## Test Scenarios

### 1. Basic Function Tests
- `runFlow()` with flow alias
- URL construction validation
- Authentication header handling

### 2. Client Class Tests
- FlowShaprClient instantiation
- Default option handling
- Method delegation

### 3. Convenience Function Tests
- `flowshapr.local.runFlow()`
- `flowshapr.production.runFlow()`
- Base URL configuration

### 4. Error Handling Tests
- HTTP error responses
- JSON parsing errors
- Network failures

### 5. Configuration Tests
- Timeout handling
- Custom headers
- Base URL variants

### 6. Streaming Tests
- Async generator structure
- Stream consumption
- Content-type handling

## Configuration

The testapp uses environment variables for configuration:

- `TEST_FLOW_ALIAS`: Flow alias to test with (default: "test-flow")
- `TEST_API_KEY`: API key for authentication (default: "test-key-123")

## Expected Behavior

Tests validate SDK behavior rather than server responses. This means:
- Network errors indicate SDK problems
- HTTP errors (404, 401, etc.) indicate the SDK is working correctly
- Focus is on request formation and response handling

## Integration with CI/CD

This testapp can be integrated into CI/CD pipelines to ensure SDK compatibility:

```bash
# In CI/CD pipeline
cd testapps/flowshapr-sdk-basic
npm install
npm test
```

The testapp exits with code 0 for success or 1 for failure, making it suitable for automated testing.