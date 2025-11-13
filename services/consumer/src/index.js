import { Kafka } from 'kafkajs';
import express from 'express';
import client from 'prom-client';

const app = express();
const port = 3000;

// Prometheus metrics
const register = client.register;
const messagesConsumed = new client.Counter({
  name: 'consumer_messages_total',
  help: 'Total messages consumed by consumer-service'
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Kafka consumer logic
const kafka = new Kafka({ clientId: 'consumer-service', brokers: [process.env.KAFKA_BROKER] });
const consumer = kafka.consumer({ groupId: 'consumer-service-group' });

// Retry helper
async function connectWithRetry() {
  while (true) {
    try {
      await consumer.connect();
      await consumer.subscribe({ topic: 'orders', fromBeginning: true });
      console.log('Kafka consumer connected and subscribed to topic "orders"');
      break; // success, exit loop
    } catch (err) {
      console.error('Failed to connect to Kafka topic:', err.message);
      console.log('Retrying in 5 seconds...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

async function run() {
  await connectWithRetry();

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const order = JSON.parse(message.value.toString());
        console.log('Processing:', order);
        messagesConsumed.inc(); // increment metric
      } catch (err) {
        console.error('Failed to process message:', err.message);
      }
    }
  });
}

run().catch(console.error);

// Expose a simple health endpoint
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.listen(port, () => console.log(`Consumer service running on port ${port}`));
