# Security Implementation

## Overview

This document outlines the security measures implemented to protect against code injection and system compromise in the Flowshapr code execution system.

## Security Architecture

### 1. Multi-Layer Defense

- **Input Sanitization**: All user inputs are sanitized before code generation
- **Code Generation Security**: Generated code is validated and sanitized
- **Container Isolation**: Flow execution happens in isolated Docker containers
- **Resource Limits**: CPU, memory, and execution time constraints
- **Network Isolation**: No network access for executing flows

### 2. Input Sanitization (`CodeSanitizer`)

#### Features:
- Template literal injection prevention
- Variable name sanitization for JavaScript compliance
- Removal of dangerous code patterns
- User input escaping and validation

#### Blocked Patterns:
- `process.env` access
- File system operations (`fs`, `path`)
- Process spawning (`child_process`)
- Code evaluation (`eval`, `Function`)
- Network access (`net`, `http`, `https`)
- System access (`os`)

### 3. Container Isolation (`ContainerExecutor`)

#### Security Features:
- **Non-root execution**: Containers run as user ID 1001
- **Read-only filesystem**: Prevents file modification
- **No network access**: `--network none`
- **Resource limits**: Memory (256MB), CPU (0.5 cores)
- **Seccomp profile**: Restricts system calls
- **Capability dropping**: Removes all Linux capabilities
- **Process limits**: Maximum 10 processes per container

#### Docker Security Configuration:
```bash
docker run \
  --user 1001:1001 \
  --read-only \
  --network none \
  --memory 256m \
  --cpus 0.5 \
  --security-opt no-new-privileges:true \
  --security-opt seccomp=seccomp.json \
  --cap-drop ALL \
  --pids-limit 10
```

### 4. Code Generation Security

#### Block Configuration Sanitization:
- User inputs in block configurations are sanitized
- Variable names are validated and corrected
- Template literals are escaped or removed

#### Generated Code Validation:
- Scans for dangerous patterns before execution
- Validates required Genkit imports are present
- Checks code structure and complexity
- Rejects code with security violations

### 5. Container Lifecycle Management

#### Features:
- Automatic container cleanup after execution
- Resource monitoring and statistics
- Force-kill capability for stuck containers  
- Health metrics and monitoring

#### Limits:
- Maximum 5 concurrent containers
- 60-second execution timeout
- Automatic cleanup of old containers

## Security Test Results

The security implementation successfully blocks:
- ✅ Environment variable access (`process.env`)
- ✅ File system access (`require('fs')`)
- ✅ Code evaluation (`eval()`)
- ✅ Template literal injection
- ✅ Invalid variable names
- ✅ Unauthorized imports

## Deployment Considerations

### Production Checklist:
- [ ] Docker daemon running and accessible
- [ ] Seccomp profile deployed to production
- [ ] Container resource limits configured
- [ ] Monitoring alerts for security violations
- [ ] Regular security audit of generated code
- [ ] Container image vulnerability scanning

### Environment Variables:
```bash
# Secure execution environment
NODE_ENV=production
CONTAINER_MEMORY_LIMIT=256m
CONTAINER_CPU_LIMIT=0.5
CONTAINER_TIMEOUT=60000
MAX_CONCURRENT_CONTAINERS=5
ENABLE_NETWORK_ACCESS=false
```

## Known Limitations

1. **Docker Dependency**: Requires Docker daemon for full security
2. **Performance Impact**: Container startup adds ~2-3 seconds per execution
3. **Resource Overhead**: Each container uses minimum 256MB RAM
4. **Limited Debugging**: Restricted filesystem limits error visibility

## Future Enhancements

1. **WebAssembly Runtime**: Explore WASM as lighter alternative to containers
2. **Advanced Static Analysis**: AST-based code analysis for deeper security
3. **Runtime Monitoring**: Real-time resource usage and anomaly detection
4. **Audit Logging**: Comprehensive security event logging
5. **Code Signing**: Verify generated code integrity

## Emergency Procedures

### Security Incident Response:
1. Immediately disable flow execution
2. Stop all active containers
3. Review audit logs for compromise indicators
4. Update security patterns if new threats identified
5. Rebuild and redeploy secure container images

### Monitoring Alerts:
- High container resource usage
- Execution timeouts
- Security violation patterns
- Unusual file system access attempts
- Multiple failed container starts