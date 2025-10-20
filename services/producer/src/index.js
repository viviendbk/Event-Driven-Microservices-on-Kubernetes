import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'producer-service',
  brokers: [process.env.KAFKA_BROKER]
});

const producer = kafka.producer();

async function run() {
  await producer.connect();

  // Send a message every 5 seconds
  setInterval(async () => {
    const order = {   // ✅ renamed
      id: Date.now(),
      product: 'Laptop',
      quantity: Math.floor(Math.random() * 5) + 1
    };

    await producer.send({
      topic: 'orders',
      messages: [{ key: order.id.toString(), value: JSON.stringify(order) }]
    });

    console.log('Producer sent:', order);
  }, 5000);
}

run().catch(console.error);
