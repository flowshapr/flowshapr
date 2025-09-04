// Load environment variables FIRST before any other imports
import { ENV } from "./config/env";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// import { auth } from "./infrastructure/auth/auth"; // Temporarily disabled
import { authRoutes } from "./domains/auth/routes";
import { organizationRoutes } from "./domains/organizations/routes";
import { teamRoutes } from "./domains/teams/routes";
import { flowRoutes } from "./domains/flows/routes";
import { errorHandler, notFoundHandler } from "./shared/middleware/errorHandler";
import { telemetryRoutes } from "./domains/telemetry/routes";
import { flowRunService } from "./domains/flows/services/FlowRunService";

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
  'http://127.0.0.1:3000',
];
const envOrigins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
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

// Container pool status endpoint
app.get("/api/system/status", (req, res) => {
  try {
    const containerStatus = flowRunService.getStatus();
    res.json({
      success: true,
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
      },
      containerPool: containerStatus
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      containerPool: { initialized: false }
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
app.use("/api/flows", flowRoutes);
app.use("/api/telemetry", telemetryRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Flowshapr server is running on port ${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth endpoint: http://localhost:${PORT}/api/auth`);
  
  // Initialize container pool for flow execution
  try {
    console.log('🐳 Initializing container pool...');
    await flowRunService.initialize();
    console.log('✅ Container pool ready for flow execution');
  } catch (error: any) {
    console.error('❌ Failed to initialize container pool:', error.message);
    console.log('⚠️  Flow execution will attempt to initialize on first use');
  }
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n👋 Shutting down gracefully...");
  try {
    console.log('🛑 Shutting down container pool...');
    await flowRunService.shutdown();
    console.log('✅ Container pool shut down');
  } catch (error: any) {
    console.error('❌ Error during container pool shutdown:', error.message);
  }
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n👋 Shutting down gracefully...");
  try {
    console.log('🛑 Shutting down container pool...');
    await flowRunService.shutdown();
    console.log('✅ Container pool shut down');
  } catch (error: any) {
    console.error('❌ Error during container pool shutdown:', error.message);
  }
  process.exit(0);
});
