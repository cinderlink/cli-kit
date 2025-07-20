/**
 * Interactive Showcase Command Handler
 * 
 * Demonstrates all interactive components with Svelte 5 runes integration.
 */

import { 
  Box, Text, LabeledBox, Button, TextInput, List, 
  FilePicker, Modal, Tabs, Tab, Checkbox, RadioGroup, 
  Select, Slider, Toggle 
} from '@tuix/components'
import { $state, $effect, $derived, $watch } from '@tuix/reactivity'
import type { InteractiveShowcaseArgs, InteractiveShowcaseFlags, InteractiveShowcaseOptions } from './schema'

interface InteractiveShowcaseHandlerProps {
  args: InteractiveShowcaseArgs
  flags: InteractiveShowcaseFlags
  options: InteractiveShowcaseOptions
}

export function InteractiveShowcaseHandler({ args, flags, options }: InteractiveShowcaseHandlerProps) {
  // Reactive state with runes
  const state = $state({
    // Form inputs
    username: '',
    password: '',
    email: '',
    description: '',
    searchQuery: '',
    
    // Selections
    selectedFile: null,
    selectedListItem: -1,
    selectedTab: 0,
    selectedOption: 'option1',
    
    // Toggles
    agreedToTerms: false,
    enableNotifications: true,
    darkMode: flags.theme === 'dark',
    
    // Numeric
    volume: 50,
    rating: 3,
    
    // UI state
    modalOpen: false,
    formSubmitted: false,
    
    // Debug
    lastAction: 'None',
    actionCount: 0
  })

  // Derived validations
  const validations = $derived(() => ({
    username: state.username.length >= 3,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email),
    password: state.password.length >= 8,
    canSubmit: state.username && state.email && state.password && state.agreedToTerms
  }))

  // Watch for debug mode
  $watch(() => state, (newState) => {
    if (flags.debug) {
      state.actionCount++
    }
  })

  // Action handlers
  const handleAction = (action: string) => {
    state.lastAction = action
    state.actionCount++
  }

  const handleSubmit = () => {
    if (validations.canSubmit) {
      state.formSubmitted = true
      handleAction('Form submitted')
    }
  }

  // Filter to specific component if requested
  const showAll = !args.component
  const showComponent = (name: string) => showAll || args.component === name

  // List items for selection
  const listItems = [
    'First Item',
    'Second Item', 
    'Third Item',
    'Fourth Item',
    'Fifth Item'
  ]

  return (
    <Box vertical gap={3} className={`theme-${flags.theme}`}>
      <Box>
        <Text style="title">Interactive Components</Text>
        <Text style="muted">
          Mode: {options.mode} | Vim: {flags.vim ? 'ON' : 'OFF'} | Validation: {flags.validation ? 'ON' : 'OFF'}
        </Text>
      </Box>
      
      {showComponent('buttons') && (
        <LabeledBox label="Buttons & Actions">
          <Box vertical gap={2}>
            <Box horizontal gap={2} wrap>
              <Button onClick={() => handleAction('Primary clicked')} variant="primary">
                Primary
              </Button>
              <Button onClick={() => handleAction('Secondary clicked')} variant="secondary">
                Secondary
              </Button>
              <Button onClick={() => handleAction('Success clicked')} variant="success">
                Success
              </Button>
              <Button onClick={() => handleAction('Warning clicked')} variant="warning">
                Warning
              </Button>
              <Button onClick={() => handleAction('Danger clicked')} variant="danger">
                Danger
              </Button>
              <Button disabled>Disabled</Button>
            </Box>
            
            <Box horizontal gap={2}>
              <Button size="small" onClick={() => handleAction('Small')}>Small</Button>
              <Button size="medium" onClick={() => handleAction('Medium')}>Medium</Button>
              <Button size="large" onClick={() => handleAction('Large')}>Large</Button>
            </Box>
            
            <Box horizontal gap={2}>
              <Button icon="▶" onClick={() => handleAction('Play')}>Play</Button>
              <Button icon="⏸" onClick={() => handleAction('Pause')}>Pause</Button>
              <Button icon="⏹" onClick={() => handleAction('Stop')}>Stop</Button>
              <Button loading>Loading</Button>
            </Box>
          </Box>
        </LabeledBox>
      )}
      
      {showComponent('inputs') && (
        <LabeledBox label="Text Inputs">
          <Box vertical gap={2}>
            <TextInput
              value={state.username}
              onChange={(value) => state.username = value}
              placeholder="Username"
              label="Username"
              vimMode={flags.vim}
              validation={flags.validation ? (validations.username ? 'valid' : 'invalid') : undefined}
              helperText={flags.validation ? 'Minimum 3 characters' : undefined}
            />
            
            <TextInput
              value={state.email}
              onChange={(value) => state.email = value}
              placeholder="email@example.com"
              label="Email"
              type="email"
              vimMode={flags.vim}
              validation={flags.validation ? (validations.email ? 'valid' : 'invalid') : undefined}
              helperText={flags.validation ? 'Valid email required' : undefined}
            />
            
            <TextInput
              value={state.password}
              onChange={(value) => state.password = value}
              placeholder="Password"
              label="Password"
              type="password"
              vimMode={flags.vim}
              validation={flags.validation ? (validations.password ? 'valid' : 'invalid') : undefined}
              helperText={flags.validation ? 'Minimum 8 characters' : undefined}
            />
            
            {flags.multiline && (
              <TextInput
                value={state.description}
                onChange={(value) => state.description = value}
                placeholder="Enter description..."
                label="Description"
                multiline
                rows={4}
                vimMode={flags.vim}
              />
            )}
            
            <TextInput
              value={state.searchQuery}
              onChange={(value) => state.searchQuery = value}
              placeholder="Search..."
              icon="🔍"
              clearable
              onClear={() => state.searchQuery = ''}
            />
          </Box>
        </LabeledBox>
      )}
      
      {showComponent('selections') && (
        <LabeledBox label="Selection Components">
          <Box vertical gap={2}>
            <Box>
              <Text>List Selection</Text>
              <List
                items={listItems}
                selectedIndex={state.selectedListItem}
                onSelect={(index) => {
                  state.selectedListItem = index
                  handleAction(`Selected: ${listItems[index]}`)
                }}
                height={5}
              />
            </Box>
            
            <Box>
              <Text>Radio Group</Text>
              <RadioGroup
                value={state.selectedOption}
                onChange={(value) => {
                  state.selectedOption = value
                  handleAction(`Radio: ${value}`)
                }}
                options={[
                  { value: 'option1', label: 'Option 1' },
                  { value: 'option2', label: 'Option 2' },
                  { value: 'option3', label: 'Option 3' }
                ]}
              />
            </Box>
            
            <Box>
              <Text>Select Dropdown</Text>
              <Select
                value={state.selectedOption}
                onChange={(value) => {
                  state.selectedOption = value
                  handleAction(`Selected: ${value}`)
                }}
                options={[
                  { value: 'option1', label: 'First Option' },
                  { value: 'option2', label: 'Second Option' },
                  { value: 'option3', label: 'Third Option' },
                  { value: 'option4', label: 'Fourth Option' }
                ]}
              />
            </Box>
          </Box>
        </LabeledBox>
      )}
      
      {showComponent('toggles') && (
        <LabeledBox label="Toggles & Checkboxes">
          <Box vertical gap={2}>
            <Checkbox
              checked={state.agreedToTerms}
              onChange={(checked) => {
                state.agreedToTerms = checked
                handleAction(`Terms: ${checked ? 'Agreed' : 'Disagreed'}`)
              }}
              label="I agree to the terms and conditions"
            />
            
            <Toggle
              checked={state.enableNotifications}
              onChange={(checked) => {
                state.enableNotifications = checked
                handleAction(`Notifications: ${checked ? 'ON' : 'OFF'}`)
              }}
              label="Enable notifications"
            />
            
            <Toggle
              checked={state.darkMode}
              onChange={(checked) => {
                state.darkMode = checked
                handleAction(`Dark mode: ${checked ? 'ON' : 'OFF'}`)
              }}
              label="Dark mode"
              variant="switch"
            />
          </Box>
        </LabeledBox>
      )}
      
      {showComponent('sliders') && (
        <LabeledBox label="Sliders & Ranges">
          <Box vertical gap={2}>
            <Box>
              <Text>Volume: {state.volume}%</Text>
              <Slider
                value={state.volume}
                onChange={(value) => {
                  state.volume = value
                  handleAction(`Volume: ${value}`)
                }}
                min={0}
                max={100}
                step={5}
              />
            </Box>
            
            <Box>
              <Text>Rating: {state.rating}/5 ⭐</Text>
              <Slider
                value={state.rating}
                onChange={(value) => {
                  state.rating = value
                  handleAction(`Rating: ${value}`)
                }}
                min={1}
                max={5}
                step={1}
                marks
              />
            </Box>
          </Box>
        </LabeledBox>
      )}
      
      {showComponent('file') && (
        <LabeledBox label="File Selection">
          <FilePicker
            onSelect={(file) => {
              state.selectedFile = file
              handleAction(`File selected: ${file}`)
            }}
            filter={(file) => !file.startsWith('.')}
            showHidden={false}
          />
          {state.selectedFile && (
            <Text style="info">Selected: {state.selectedFile}</Text>
          )}
        </LabeledBox>
      )}
      
      {showComponent('tabs') && (
        <LabeledBox label="Tabbed Interface">
          <Tabs
            selectedIndex={state.selectedTab}
            onChange={(index) => {
              state.selectedTab = index
              handleAction(`Tab ${index} selected`)
            }}
          >
            <Tab label="First Tab">
              <Box padding={2}>
                <Text>Content of the first tab</Text>
              </Box>
            </Tab>
            <Tab label="Second Tab">
              <Box padding={2}>
                <Text>Content of the second tab</Text>
              </Box>
            </Tab>
            <Tab label="Third Tab">
              <Box padding={2}>
                <Text>Content of the third tab</Text>
              </Box>
            </Tab>
          </Tabs>
        </LabeledBox>
      )}
      
      {showComponent('modal') && (
        <LabeledBox label="Modal Dialog">
          <Box vertical gap={2}>
            <Button onClick={() => state.modalOpen = true}>
              Open Modal
            </Button>
            
            <Modal
              isOpen={state.modalOpen}
              onClose={() => {
                state.modalOpen = false
                handleAction('Modal closed')
              }}
              title="Example Modal"
            >
              <Box vertical gap={2}>
                <Text>This is modal content!</Text>
                <Text style="muted">Press ESC or click outside to close.</Text>
                <Box horizontal gap={2}>
                  <Button onClick={() => {
                    state.modalOpen = false
                    handleAction('Modal confirmed')
                  }} variant="primary">
                    Confirm
                  </Button>
                  <Button onClick={() => {
                    state.modalOpen = false
                    handleAction('Modal cancelled')
                  }} variant="secondary">
                    Cancel
                  </Button>
                </Box>
              </Box>
            </Modal>
          </Box>
        </LabeledBox>
      )}
      
      {options.mode === 'playground' && (
        <LabeledBox label="Complete Form Example">
          <Box vertical gap={2}>
            <TextInput
              value={state.username}
              onChange={(value) => state.username = value}
              placeholder="Username"
              label="Username"
              validation={validations.username ? 'valid' : 'invalid'}
            />
            <TextInput
              value={state.email}
              onChange={(value) => state.email = value}
              placeholder="Email"
              label="Email"
              type="email"
              validation={validations.email ? 'valid' : 'invalid'}
            />
            <TextInput
              value={state.password}
              onChange={(value) => state.password = value}
              placeholder="Password"
              label="Password"
              type="password"
              validation={validations.password ? 'valid' : 'invalid'}
            />
            <Checkbox
              checked={state.agreedToTerms}
              onChange={(checked) => state.agreedToTerms = checked}
              label="I agree to terms"
            />
            <Button
              onClick={handleSubmit}
              disabled={!validations.canSubmit}
              variant="primary"
            >
              Submit Form
            </Button>
            {state.formSubmitted && (
              <Text style="success">Form submitted successfully!</Text>
            )}
          </Box>
        </LabeledBox>
      )}
      
      {flags.debug && (
        <LabeledBox label="Debug Information">
          <Box vertical gap={1}>
            <Text>Last Action: {state.lastAction}</Text>
            <Text>Action Count: {state.actionCount}</Text>
            <Text>Form Valid: {validations.canSubmit ? 'Yes' : 'No'}</Text>
          </Box>
        </LabeledBox>
      )}
    </Box>
  )
}