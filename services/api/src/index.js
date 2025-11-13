import express from "express";
import { Kafka } from "kafkajs";
import client from "prom-client";

const app = express();
const port = process.env.PORT || 3000;
const KAFKA_BROKER = process.env.KAFKA_BROKER || "kafka.kafka.svc.cluster.local:9092";

// ------------------------
// Prometheus metrics setup
// ------------------------
const register = client.register;

// Total API requests by endpoint
const requestCounter = new client.Counter({
  name: 'api_requests_total',
  help: 'Total number of API requests',
  labelNames: ['endpoint'],
});

// Total messages consumed
const messagesConsumed = new client.Counter({
  name: 'api_messages_consumed_total',
  help: 'Total messages consumed by api-service'
});

// Middleware to count requests
app.use((req, res, next) => {
  requestCounter.labels(req.path).inc();
  next();
});

// Metrics endpoint
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// Health endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ------------------------
// Kafka setup
// ------------------------
const kafka = new Kafka({
  clientId: "api-service",
  brokers: [KAFKA_BROKER],
});

// Consumer per request pattern
app.get("/messages", async (req, res) => {
  const topic = req.query.topic || "orders";
  const limit = parseInt(req.query.limit || "10");
  const messages = [];
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;
  const MAX_WAIT_MS = 5000;

  const consumer = kafka.consumer({ groupId: `api-consumer-${Date.now()}` });

  try {
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: true });

    let messageCount = 0;
    await Promise.race([
      new Promise((resolve) => {
        consumer.run({
          eachMessage: async ({ topic, partition, message }) => {
            const timestamp = parseInt(message.timestamp || "0");
            if (timestamp >= fiveMinutesAgo) {
              messages.push({
                topic,
                partition,
                offset: message.offset,
                timestamp: new Date(timestamp).toISOString(),
                key: message.key ? message.key.toString() : null,
                value: message.value ? message.value.toString() : null,
              });
              messagesConsumed.inc(); // increment metric
            }
            messageCount++;
            if (messages.length >= limit) resolve();
          },
        });
      }),
      new Promise((resolve) => setTimeout(resolve, MAX_WAIT_MS)),
    ]);
  } catch (err) {
    console.error("[ERROR] Kafka consumer failed:", err);
  } finally {
    try {
      await consumer.disconnect();
    } catch (e) {
      console.error("[ERROR] Failed to disconnect consumer:", e);
    }
  }

  res.json(messages);
});

// ------------------------
// Start API service
// ------------------------
app.listen(port, () => {
  console.log(`API service running on port ${port}`);
});
