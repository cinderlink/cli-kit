# Performance Monitoring

## Overview

Performance Monitoring tracks and reports performance metrics across modules, including event throughput and response times. It provides real-time health reporting and historical performance data analysis.

## Key Concepts

### Metrics Collection
The performance monitor continuously collects metrics about event processing, including throughput, latency, and resource utilization.

### Health Reporting
Health reports provide a snapshot of the system's current performance status, enabling proactive issue detection and resolution.

### Alerting
The system can be configured to trigger alerts when performance metrics exceed defined thresholds.

## Usage

```typescript
import { PerformanceMonitor } from '@core/coordination'

const monitor = new PerformanceMonitor(eventBus)

// Start monitoring
await monitor.startMonitoring()

// Get current metrics
const metrics = await monitor.getMetrics()

// Generate a health report
const report = await monitor.generateHealthReport()

// Stop monitoring
await monitor.stopMonitoring()
```

## API

### `startMonitoring(): Effect<void, CoordinationError>`
Starts performance monitoring.

### `stopMonitoring(): Effect<void, CoordinationError>`
Stops performance monitoring.

### `getMetrics(): Effect<PerformanceMetrics, CoordinationError>`
Gets the current performance metrics.

### `generateHealthReport(): Effect<HealthReport, CoordinationError>`
Generates a health report based on current metrics.
