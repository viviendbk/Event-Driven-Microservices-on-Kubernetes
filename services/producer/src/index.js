import { Kafka } from 'kafkajs';
import express from 'express';
import client from 'prom-client';

const app = express();
const port = 3000;

// Prometheus metrics
const register = client.register;
const messagesProduced = new client.Counter({
  name: 'producer_messages_total',
  help: 'Total messages produced by producer-service'
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Kafka producer logic
const kafka = new Kafka({ clientId: 'producer-service', brokers: [process.env.KAFKA_BROKER] });
const producer = kafka.producer();

async function run() {
  while (true) {
    try {
      await producer.connect();
      console.log("✅ Connected to Kafka broker");

      // Produce messages in a loop
      setInterval(async () => {
        try {
          const order = {
            id: Date.now(),
            product: 'Laptop',
            quantity: Math.floor(Math.random() * 5) + 1
          };
          await producer.send({
            topic: 'orders',
            messages: [{ key: order.id.toString(), value: JSON.stringify(order) }]
          });
          console.log('Produced:', order);
          messagesProduced.inc();
        } catch (err) {
          console.error('❌ Failed to produce message:', err.message);
        }
      }, 5000);

      break; // Exit retry loop once connected
    } catch (err) {
      console.error('⚠️ Kafka connection failed:', err.message);
      console.log('Retrying connection in 10 seconds...');
      await new Promise(res => setTimeout(res, 10000));
    }
  }
}

run().catch(console.error);

// Health endpoint
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.listen(port, () => console.log(`Producer service running on port ${port}`));
