# Event Choreography

## Overview

Event Choreography implements patterns for coordinating events across multiple domain modules without tight coupling. It uses publish-subscribe patterns to enable loosely coupled event flows.

## Key Concepts

### Event Flow
An event flow defines how events move from one module to another, potentially with transformations applied along the way.

### Transformation
Transformations allow you to modify events as they pass through the choreography system, enabling data mapping and enrichment.

## Usage

```typescript
import { EventChoreographer } from './choreography'
import { getGlobalEventBus } from '@core/model/events/event-bus'

// Assuming eventBus is initialized
const eventBus = getGlobalEventBus();
const choreographer = new EventChoreographer(eventBus);

// Coordinate various parts of the system
choreographer.coordinateProcessWithLogging();
choreographer.coordinateCLIWithUI();
choreographer.coordinateConfigUpdates();
```

## API

### `coordinateProcessWithLogging(): Effect<void, ChoreographyError>`
Subscribes to process lifecycle and output events to generate structured logs. This flow helps in monitoring process health and activity.

### `coordinateCLIWithUI(): Effect<void, ChoreoreographyError>`
Coordinates CLI command events with UI components, allowing for real-time updates and user feedback during command execution.

### `coordinateConfigUpdates(): Effect<void, ChoreographyError>`
Listens for configuration change events and propagates them to all relevant modules, ensuring the system stays in sync.
