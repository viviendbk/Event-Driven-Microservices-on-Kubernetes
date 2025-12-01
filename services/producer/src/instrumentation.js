/* instrumentation.js */
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-grpc');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

// 1. Setup Exporters (gRPC)
// They automatically find the URL from OTEL_EXPORTER_OTLP_ENDPOINT env var
const traceExporter = new OTLPTraceExporter();
const metricExporter = new OTLPMetricExporter();

const sdk = new NodeSDK({
  // Name the service for Dynatrace
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]:'producer-service',
  }),
  traceExporter,
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 3000,
  }),
  // This enables the "Magic": Auto-instrumentation for Kafka, Express, etc.
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

console.log('✅ OpenTelemetry SDK started via gRPC');

process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .finally(() => process.exit(0));
});