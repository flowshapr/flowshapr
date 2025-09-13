# Genkit Client Compatibility Testapp

This testapp validates that FlowShapr endpoints maintain compatibility with the official Genkit client library.

## Purpose

Ensures FlowShapr's flow execution endpoints work seamlessly with:
- Official Genkit client (`genkit/client`)
- Request/response format compatibility
- Authentication methods
- Error handling patterns
- Streaming behavior

## Key Tests

### 1. Request Format Compatibility
Validates that both Genkit client and FlowShapr SDK send identical:
- HTTP methods (POST)
- Content-Type headers
- Request body structure
- Authentication headers

### 2. Response Format Compatibility
Ensures both clients handle responses identically:
- Success response parsing
- Data structure preservation
- Content-type handling

### 3. Error Handling Compatibility
Verifies consistent error behavior:
- HTTP status code handling
- Error message extraction
- Exception throwing patterns

### 4. Authentication Compatibility
Tests auth implementation parity:
- Bearer token format
- Header structure
- Authorization flow

### 5. Streaming Compatibility
Validates streaming interface consistency:
- AsyncIterator structure
- Chunk yielding behavior
- Stream consumption patterns

## Usage

### Prerequisites

```bash
# Install dependencies
npm install

# Set environment variables (optional)
export TEST_FLOW_ID="your-genkit-flow-id"
export TEST_FLOW_ALIAS="your-flowshapr-alias"
export TEST_API_KEY="your-api-key"
```

### Running Tests

```bash
# Run compatibility tests
npm test

# Development mode
npm run dev

# Direct execution
npx tsx src/index.ts
```

## Configuration

Environment variables:
- `TEST_FLOW_ID`: Genkit flow identifier for testing
- `TEST_FLOW_ALIAS`: FlowShapr flow alias for testing
- `TEST_API_KEY`: API key for authentication tests

## Test Strategy

The testapp uses controlled mocking to compare client behaviors:

1. **Mock Server**: Intercepts HTTP requests from both clients
2. **Request Comparison**: Analyzes request structure and headers
3. **Response Simulation**: Provides identical responses to both clients
4. **Behavior Validation**: Ensures consistent error handling and data flow

## Expected Outcomes

All tests should pass, indicating:
- ✅ FlowShapr endpoints are fully Genkit-compatible
- ✅ Developers can use official Genkit client with FlowShapr
- ✅ Migration between SDKs requires minimal changes
- ✅ Error handling follows Genkit patterns

## Failure Investigation

If tests fail:

1. **Request Format Issues**: Check HTTP method, headers, body structure
2. **Response Parsing**: Verify JSON format and data structure
3. **Error Handling**: Ensure proper error message extraction
4. **Authentication**: Validate Bearer token implementation

## CI/CD Integration

Include in continuous integration to catch compatibility regressions:

```bash
cd testapps/genkit-client-compatibility
npm install
npm test
```

Exit codes:
- `0`: Full compatibility
- `1`: Compatibility issues detected