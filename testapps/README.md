# FlowShapr Testapps

This directory contains integration test applications for FlowShapr SDK functionality, following the Genkit project's testapp pattern for comprehensive testing.

## Overview

The testapps validate FlowShapr's compatibility with Genkit client standards and ensure reliable SDK operation across different scenarios. Each testapp focuses on specific aspects of the SDK while maintaining isolation from the main application.

## Available Testapps

### 1. `flowshapr-sdk-basic/`
**Purpose**: Official FlowShapr SDK (`@flowshapr/client`) functionality testing
- ✅ Flow execution via aliases using `FlowshaprClient`
- ✅ Authentication handling with API keys
- ✅ Error scenarios and wrapped response format
- ✅ Local vs production environments
- ✅ AbortSignal/timeout configuration
- ✅ Request/response format validation

### 2. `genkit-client-compatibility/`
**Purpose**: Genkit client library compatibility validation
- ✅ Request/response format compatibility
- ✅ Authentication method parity
- ✅ Error handling consistency
- ✅ Streaming interface compatibility
- ✅ Side-by-side behavior comparison

### 3. `streaming-flows/`
**Purpose**: Advanced streaming capabilities testing
- ✅ Server-Sent Events (SSE) streaming
- ✅ Non-streaming fallback behavior
- ✅ Stream error handling and recovery
- ✅ Large stream processing
- ✅ Malformed data resilience
- ✅ Authentication with streaming

## Quick Start

### Install All Dependencies

```bash
npm run testapps:install
```

### Run All Tests

```bash
npm run testapps
```

### Run Individual Testapps

```bash
# Basic SDK functionality
npm run testapps:sdk-basic

# Genkit compatibility
npm run testapps:genkit-compat

# Streaming capabilities
npm run testapps:streaming
```

## Test Configuration

Each testapp can be configured via environment variables:

```bash
# Flow identifiers for testing
export TEST_FLOW_ALIAS="your-test-flow"
export TEST_FLOW_ID="your-genkit-flow-id"

# Authentication
export TEST_API_KEY="your-test-api-key"

# Run tests
npm run testapps
```

## CI/CD Integration

The testapps are designed for continuous integration:

```bash
# In CI pipeline
npm run testapps:install
npm run testapps
```

Exit codes:
- `0`: All tests passed
- `1`: One or more test failures

## Benefits Over Previous Approach

### Before: Public SDK Test Page
- ❌ Inappropriate for public exposure
- ❌ Manual testing only
- ❌ No CI/CD integration
- ❌ Limited test scenarios
- ❌ UI-dependent testing

### Now: Professional Testapps
- ✅ Private, development-focused
- ✅ Automated integration testing
- ✅ Full CI/CD pipeline support
- ✅ Comprehensive scenario coverage
- ✅ Programmatic validation
- ✅ Industry-standard approach
- ✅ Clear documentation and examples

## Development Workflow

### Adding New Testapps

1. Create directory: `testapps/new-testapp-name/`
2. Follow existing structure: `package.json`, `tsconfig.json`, `src/`, `README.md`
3. Add test script to main `package.json`
4. Update this README with new testapp description

### Running During Development

```bash
# Watch mode for active development
cd testapps/flowshapr-sdk-basic
npm run dev

# One-time execution
cd testapps/genkit-client-compatibility
npm test
```

## Architecture

Each testapp follows consistent patterns:

### Structure
```
testapps/{name}/
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── src/
│   ├── index.ts         # Main test runner
│   ├── flowshapr-sdk.ts # SDK copy for isolation
│   └── ...              # Additional test modules
└── README.md            # Testapp-specific documentation
```

### Test Runner Pattern
- **Result Tracking**: Standardized test result format
- **Error Handling**: Comprehensive error capture and reporting
- **Timing**: Performance measurement for all tests
- **Summary**: Clear pass/fail reporting with details

### Isolation Principle
Each testapp includes its own SDK copy to ensure:
- No dependency on main application changes
- Consistent test behavior across versions
- Ability to test different SDK configurations
- Independence from external SDK modifications

## Troubleshooting

### Common Issues

#### NetworkError / Connection Refused
Expected behavior - testapps validate SDK functionality, not server responses.

#### Import/Module Errors
Ensure dependencies are installed: `npm run testapps:install`

#### TypeScript Errors
Each testapp has isolated TypeScript config - check individual `tsconfig.json` files.

#### Test Timeouts
Some tests use intentional timeouts for validation - check test-specific documentation.

### Debug Mode

Run individual testapps with detailed output:

```bash
cd testapps/streaming-flows
DEBUG=* npm test
```

## Future Extensions

Potential additional testapps:
- **Performance Testing**: Load testing and benchmarking
- **Error Scenarios**: Network failure simulation
- **Multi-Environment**: Cross-platform compatibility
- **Version Compatibility**: SDK version migration testing

## Contributing

When adding new testapps:
1. Follow existing naming and structure conventions
2. Include comprehensive README documentation
3. Add appropriate npm scripts to main package.json
4. Update this overview README
5. Ensure CI/CD compatibility