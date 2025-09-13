// Load environment variables FIRST before any other imports
import { ENV } from "./config/env";
import { logError } from "./shared/utils/logger";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// import { auth } from "./infrastructure/auth/auth"; // Temporarily disabled
import { authRoutes } from "./domains/auth/routes";
import { organizationRoutes } from "./domains/organizations/routes";
import { teamRoutes } from "./domains/teams/routes";
import { userRoutes } from "./domains/users/routes";
import { flowRoutes } from "./domains/flows/routes";
import { telemetryRoutes } from "./domains/telemetry/routes";
import { errorHandler, notFoundHandler } from "./shared/middleware/errorHandler";
import { flowRunService } from "./domains/flows/services/FlowRunService";
import blocksRoutes from "./domains/blocks/routes";
import { initializeServerBlocks } from "./domains/blocks";

const app = express();
const PORT = ENV.PORT;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration with explicit credentials and flexible origins
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:3003',
  'http://localhost:3004',
  'http://localhost:3005',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3003',
  'http://127.0.0.1:3004',
  'http://127.0.0.1:3005',
];
// Auto-fix CORS origins missing protocol
const rawEnvOrigins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
const envOrigins = rawEnvOrigins.map(origin => {
  if (origin && !origin.startsWith('http://') && !origin.startsWith('https://')) {
    console.warn(`⚠️  CORS_ORIGIN missing protocol: ${origin}`);
    const corrected = `https://${origin}`;
    console.log(`✅ Auto-corrected CORS origin to: ${corrected}`);
    return corrected;
  }
  return origin;
});

const allowedOrigins = new Set([...defaultOrigins, ...envOrigins]);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // SSR or same-origin
    if (allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  optionsSuccessStatus: 200,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    error: "Too many requests from this IP, please try again later",
  },
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Cookie parsing middleware (simple implementation)
app.use((req, res, next) => {
  const cookies: Record<string, string> = {};
  if (req.headers.cookie) {
    req.headers.cookie.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
    });
  }
  req.cookies = cookies;
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Flowshapr server is running",
    timestamp: new Date().toISOString(),
  });
});

// Process executor status endpoint
app.get("/api/system/status", (req, res) => {
  try {
    const executorStatus = flowRunService.getStatus();
    res.json({
      success: true,
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
      },
      processExecutor: executorStatus
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      processExecutor: { initialized: false }
    });
  }
});

// Better Auth routes - disabled temporarily
// app.all("/api/auth*", auth.handler);

// Authentication routes (using domain-driven design)
app.use("/api/auth", authRoutes);

// API routes
app.use("/api/organizations", organizationRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/users", userRoutes);
app.use("/api/flows", flowRoutes);
app.use("/telemetry", telemetryRoutes);
app.use("/api", blocksRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Flowshapr server is running on port ${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth endpoint: http://localhost:${PORT}/api/auth`);
  
  // Initialize server-side blocks
  try {
    console.log('🧩 Initializing server-side blocks...');
    initializeServerBlocks();
    console.log('✅ Server blocks ready');
  } catch (error: any) {
    logError('❌ Failed to initialize blocks:', error.message);
  }
  
  // Initialize process executor for flow execution
  try {
    console.log('⚙️  Initializing process executor...');
    await flowRunService.initialize();
    console.log('✅ Process executor ready for flow execution');
  } catch (error: any) {
    logError('❌ Failed to initialize process executor:', error.message);
    console.log('⚠️  Flow execution will attempt to initialize on first use');
  }
  
  // Genkit telemetry server is running
  console.log('📊 Genkit telemetry server is active');
  console.log('🔍 Child processes will send traces to /telemetry endpoint');
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n👋 Shutting down gracefully...");
  try {
    console.log('🛑 Shutting down process executor...');
    await flowRunService.shutdown();
    console.log('✅ Process executor shut down');
  } catch (error: any) {
    logError('❌ Error during process executor shutdown:', error.message);
  }
  
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n👋 Shutting down gracefully...");
  try {
    console.log('🛑 Shutting down process executor...');
    await flowRunService.shutdown();
    console.log('✅ Process executor shut down');
  } catch (error: any) {
    logError('❌ Error during process executor shutdown:', error.message);
  }
  
  process.exit(0);
});
