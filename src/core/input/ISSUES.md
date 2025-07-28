# Input Module Issues

## Known Issues

### 1. Focus Order Bugs
- **Issue**: Dynamic component insertion can break tab order
- **Impact**: Unexpected navigation behavior
- **Solution**: Implement automatic tab index management

### 2. Mouse Coordinate Accuracy
- **Issue**: Mouse coordinates can be off in some terminal emulators
- **Impact**: Clicks register on wrong elements
- **Solution**: Add terminal-specific calibration

### 3. Key Event Inconsistencies
- **Issue**: Special keys behave differently across platforms
- **Impact**: Shortcuts may not work as expected
- **Solution**: Comprehensive key event normalization

### 4. Focus Trap Edge Cases
- **Issue**: Nested focus traps can cause focus to be lost
- **Impact**: User gets stuck or focus escapes modal
- **Solution**: Improve trap stack management

### 5. No Gamepad Support
- **Issue**: Modern terminals support gamepad but we don't
- **Impact**: Missing input method for some applications
- **Solution**: Add gamepad API integration

## Improvements Needed

### High Priority

1. **Focus Restoration**
   - Save and restore focus when switching contexts
   - Handle focus for dynamically loaded content
   - Improve focus memory for modals

2. **Input Validation**
   - Validate component IDs are unique
   - Check for circular focus traps
   - Ensure tab indices are valid

3. **Better Mouse Support**
   - Right-click context menus
   - Double-click detection
   - Mouse button state tracking

### Medium Priority

1. **Keyboard Shortcuts**
   - Global shortcut registry
   - Conflict detection
   - Customizable key bindings

2. **Performance**
   - Optimize hit testing for many components
   - Batch focus updates
   - Lazy event handler registration

3. **Testing Utilities**
   - Input simulation helpers
   - Focus assertion utilities
   - Mouse event mocking

### Low Priority

1. **Advanced Features**
   - Input method editor (IME) support
   - Clipboard integration
   - Drag and drop preview

2. **Platform Support**
   - Windows Terminal specific features
   - iTerm2 advanced mouse reporting
   - Kitty keyboard protocol

## Technical Debt

1. **Event System**: Current event routing could be more efficient
2. **State Management**: Focus state should use Effect Ref consistently
3. **Type Safety**: Mouse event types could be more specific
4. **Documentation**: Need more examples and edge case documentation
5. **Test Coverage**: Mouse and keyboard modules lack tests

## Future Considerations

- Support for alternative input devices
- Integration with native OS accessibility APIs
- WebAssembly-based input processing
- Machine learning for gesture recognition
- Biometric input support (where available)