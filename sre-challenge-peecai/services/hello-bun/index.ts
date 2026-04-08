import { serve } from "bun";
import client from "prom-client";

const register = new client.Registry();
const httpRequestCounter = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code", "instanceId"],
});

client.collectDefaultMetrics({ register });
register.registerMetric(httpRequestCounter);

serve({
  routes: {
    "/metrics": async () => {
      const metrics = await register.metrics();
      return new Response(metrics, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; version=0.0.4",
        },
      });
    },
  },
  async fetch(req) {
    httpRequestCounter.inc({
      method: req.method,
      route: "/",
      status_code: "200",
      instanceId: Math.ceil(Math.random() * 5),
    });
    return new Response("Hello from Bun!", { status: 200 });
  },
  port: 8080,
});
