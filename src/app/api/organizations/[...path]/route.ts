import { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function GET(request: NextRequest) {
  return proxyToBackend(request);
}

export async function POST(request: NextRequest) {
  return proxyToBackend(request);
}

export async function PUT(request: NextRequest) {
  return proxyToBackend(request);
}

export async function DELETE(request: NextRequest) {
  return proxyToBackend(request);
}

export async function PATCH(request: NextRequest) {
  return proxyToBackend(request);
}

async function proxyToBackend(request: NextRequest) {
  const url = new URL(request.url);
  const backendUrl = `${BACKEND_URL}${url.pathname}${url.search}`;

  const body = ["GET", "HEAD"].includes(request.method) 
    ? undefined 
    : await request.text();

  const response = await fetch(backendUrl, {
    method: request.method,
    headers: {
      ...Object.fromEntries(request.headers.entries()),
      "host": new URL(BACKEND_URL).host,
    },
    body,
  });

  const responseBody = await response.text();
  
  return new Response(responseBody, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}