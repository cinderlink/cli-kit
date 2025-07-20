/**
 * Interactive Showcase View
 * 
 * Demonstrates all interactive components.
 */

import { Box, Text, LabeledBox, Button, TextInput, Select, Checkbox, Radio, Modal, Tabs } from '@tuix/components'
import { $state } from '@tuix/reactivity'

export function InteractiveShowcaseView() {
  const state = $state({
    textValue: '',
    selectValue: 'option1',
    checkboxValue: false,
    radioValue: 'radio1',
    modalOpen: false,
    activeTab: 0
  })

  return (
    <Box vertical gap={3}>
      <Text style="title">Interactive Components Showcase</Text>
      
      <LabeledBox label="Buttons">
        <Box horizontal gap={2}>
          <Button variant="primary" onClick={() => console.log('Primary')}>Primary</Button>
          <Button variant="secondary" onClick={() => console.log('Secondary')}>Secondary</Button>
          <Button variant="danger" onClick={() => console.log('Danger')}>Danger</Button>
          <Button disabled onClick={() => console.log('Disabled')}>Disabled</Button>
        </Box>
      </LabeledBox>
      
      <LabeledBox label="Text Input">
        <TextInput 
          value={state.textValue}
          onChange={(value) => state.textValue = value}
          placeholder="Type something..."
        />
        <Text style="muted">You typed: {state.textValue}</Text>
      </LabeledBox>
      
      <LabeledBox label="Select">
        <Select
          value={state.selectValue}
          onChange={(value) => state.selectValue = value}
          options={[
            { value: 'option1', label: 'Option 1' },
            { value: 'option2', label: 'Option 2' },
            { value: 'option3', label: 'Option 3' }
          ]}
        />
      </LabeledBox>
      
      <LabeledBox label="Checkbox & Radio">
        <Box vertical gap={2}>
          <Checkbox
            checked={state.checkboxValue}
            onChange={(checked) => state.checkboxValue = checked}
            label="Checkbox option"
          />
          
          <Box vertical gap={1}>
            <Radio
              name="demo"
              value="radio1"
              checked={state.radioValue === 'radio1'}
              onChange={() => state.radioValue = 'radio1'}
              label="Radio option 1"
            />
            <Radio
              name="demo"
              value="radio2"
              checked={state.radioValue === 'radio2'}
              onChange={() => state.radioValue = 'radio2'}
              label="Radio option 2"
            />
          </Box>
        </Box>
      </LabeledBox>
      
      <LabeledBox label="Modal">
        <Button onClick={() => state.modalOpen = true}>Open Modal</Button>
        <Modal
          isOpen={state.modalOpen}
          onClose={() => state.modalOpen = false}
          title="Example Modal"
        >
          <Text>This is modal content.</Text>
          <Box horizontal gap={2}>
            <Button onClick={() => state.modalOpen = false}>Close</Button>
            <Button variant="primary">Action</Button>
          </Box>
        </Modal>
      </LabeledBox>
      
      <LabeledBox label="Tabs">
        <Tabs activeTab={state.activeTab} onChange={(tab) => state.activeTab = tab}>
          <Tabs.Tab label="Tab 1">
            <Text>Content for tab 1</Text>
          </Tabs.Tab>
          <Tabs.Tab label="Tab 2">
            <Text>Content for tab 2</Text>
          </Tabs.Tab>
          <Tabs.Tab label="Tab 3">
            <Text>Content for tab 3</Text>
          </Tabs.Tab>
        </Tabs>
      </LabeledBox>
    </Box>
  )
}