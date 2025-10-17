import express from "express";
import { Kafka } from "kafkajs";

const app = express();
const port = process.env.PORT || 3000;

const kafka = new Kafka({
  clientId: "api-service",
  brokers: [process.env.KAFKA_BROKER || "kafka.kafka.svc.cluster.local:9092"],
});

// Health endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/messages", async (req, res) => {
  const topic = req.query.topic || "my-topic";
  const limit = parseInt(req.query.limit || "10");
  const messages = [];
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000; // 5 minutes in ms
  const MAX_WAIT_MS = 5000; // 5 seconds max wait

  const consumer = kafka.consumer({ groupId: `api-consumer-${Date.now()}` });
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });

  // Promise that resolves either when limit is reached or max wait time elapsed
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
          }
          if (messages.length >= limit) {
            resolve();
          }
        },
      });
    }),
    new Promise((resolve) => setTimeout(resolve, MAX_WAIT_MS)), // timeout fallback
  ]);

  await consumer.disconnect();
  res.json(messages); // could be empty if no recent messages
});

app.listen(port, () => {
  console.log(`API service running on port ${port}`);
});
