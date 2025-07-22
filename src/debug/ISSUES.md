# Debug Module Issues

## Known Issues

### Performance
- [ ] Debug mode adds ~50ms to startup time
- [ ] Large event logs (>10k events) cause UI lag
- [ ] Memory usage increases linearly with event count

### UI/UX
- [ ] Tab switching via mouse sometimes misses clicks
- [ ] Scrolling in event logs can be janky
- [ ] Help overlay doesn't update when terminal resizes

### Integration
- [ ] Some logger transports bypass debug capture
- [ ] Async scope activations may be missed
- [ ] JSX fragment rendering not properly tracked

## Workarounds

### High Memory Usage
Set `TUIX_DEBUG_MAX_EVENTS=500` to limit event retention:
```bash
TUIX_DEBUG=true TUIX_DEBUG_MAX_EVENTS=500 bun run app
```

### Missing Logger Output
Ensure logger transports are configured for debug capture:
```typescript
const logger = new TuixLogger({
  transports: [new DebugTransport()] // From debug module
})
```

## Reporting Issues

Please include:
1. Debug mode settings (env vars)
2. Application type (CLI/JSX)
3. Event count when issue occurred
4. Terminal dimensions