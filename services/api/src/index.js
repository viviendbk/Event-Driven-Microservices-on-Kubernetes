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
  const topic = req.query.topic || "orders";
  const limit = parseInt(req.query.limit || "10");
  const messages = [];
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000; // 5 minutes in ms
  const MAX_WAIT_MS = 5000; // 5 seconds max wait

  console.log(`[API] Received /messages request for topic "${topic}" (limit=${limit})`);
  console.log(`[API] Connecting to Kafka at ${process.env.KAFKA_BROKER || "kafka.kafka.svc.cluster.local:9092"}`);

  const consumer = kafka.consumer({ groupId: `api-consumer-${Date.now()}` });

  try {
    await consumer.connect();
    console.log("[Kafka] Connected successfully");

    await consumer.subscribe({ topic, fromBeginning: true });
    console.log(`[Kafka] Subscribed to topic "${topic}"`);

    let messageCount = 0;
    const startTime = Date.now();

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
            messageCount++;
            if (messageCount % 10 === 0) {
              console.log(`[Kafka] Processed ${messageCount} messages so far...`);
            }
            if (messages.length >= limit) {
              console.log(`[Kafka] Reached limit (${limit}), resolving`);
              resolve();
            }
          },
        });
      }),
      new Promise((resolve) => {
        setTimeout(() => {
          console.log("[Kafka] Timeout reached, stopping consumer");
          resolve();
        }, MAX_WAIT_MS);
      }),
    ]);

    console.log(`[Kafka] Finished processing — found ${messages.length} messages in last 5 minutes`);
  } catch (err) {
    console.error("[ERROR] Kafka consumer failed:", err);
  } finally {
    try {
      await consumer.disconnect();
      console.log("[Kafka] Disconnected cleanly");
    } catch (e) {
      console.error("[ERROR] Failed to disconnect consumer:", e);
    }
  }

  res.json(messages);
});

app.listen(port, () => {
  console.log(`API service running on port ${port}`);
});
