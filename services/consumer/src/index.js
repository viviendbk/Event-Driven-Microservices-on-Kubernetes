import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'consumer-service',
  brokers: [process.env.KAFKA_BROKER]
});

const consumer = kafka.consumer({ groupId: 'consumer-service-group' });

async function run() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'orders', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const producer = JSON.parse(message.value.toString());
      console.log('Processing producer for consumer:', producer);
    }
  });
}

run().catch(console.error);
