/**
 * UI Components Demo
 * 
 * Demonstrates the List, Table, and Tabs components
 */

import { jsx } from '../../../../../src/jsx/runtime/index.js'
import { $state } from '../../../../../src/core/update/reactivity/runes.js'
import { List, SimpleList, CheckList, NumberedList } from '../../../../../src/ui/components/data/list/index.js'
import { Table, DataTable, CompactTable, type Column } from '../../../../../src/ui/components/data/table/index.js'
import { Tabs, Tab, SimpleTabs, PillTabs } from '../../../../../src/ui/components/navigation/tabs/index.js'
import { Box } from '../../../../../src/ui/components/layout/box/index.js'
import { Text } from '../../../../../src/ui/components/display/text/index.js'
import { Button } from '../../../../../src/ui/components/forms/button/index.js'
import { vstack, hstack } from '../../../../../src/core/view/primitives/view.js'
import { style, Colors } from '../../../../../src/core/terminal/ansi/styles/index.js'

// Sample data for demos
const listItems = [
  'Apple',
  'Banana',
  'Cherry',
  'Date',
  'Elderberry',
  'Fig',
  'Grape',
  'Honeydew'
]

const tableData = [
  { id: 1, name: 'John Doe', role: 'Developer', status: 'Active', salary: 85000 },
  { id: 2, name: 'Jane Smith', role: 'Designer', status: 'Active', salary: 75000 },
  { id: 3, name: 'Bob Johnson', role: 'Manager', status: 'On Leave', salary: 95000 },
  { id: 4, name: 'Alice Brown', role: 'Developer', status: 'Active', salary: 82000 },
  { id: 5, name: 'Charlie Wilson', role: 'Tester', status: 'Active', salary: 65000 }
]

const tableColumns: Column[] = [
  { key: 'id', label: 'ID', width: 5, align: 'center' },
  { key: 'name', label: 'Name', width: 20 },
  { 
    key: 'role', 
    label: 'Role', 
    width: 15,
    style: (value) => style().foreground(
      value === 'Developer' ? Colors.blue :
      value === 'Designer' ? Colors.magenta :
      value === 'Manager' ? Colors.green :
      Colors.gray
    )
  },
  { 
    key: 'status', 
    label: 'Status', 
    width: 15,
    render: (value) => jsx('text', {
      style: style()
        .foreground(value === 'Active' ? Colors.green : Colors.yellow)
        .bold(),
      children: value
    })
  },
  { 
    key: 'salary', 
    label: 'Salary', 
    width: 15, 
    align: 'right',
    format: (value) => `$${value.toLocaleString()}`,
    sortable: true
  }
]

export function UIComponentsDemo() {
  const activeTab = $state(0)
  const selectedListItem = $state(0)
  const selectedCheckItems = $state<number[]>([])
  const selectedTableRow = $state(0)
  const filterValue = $state('')
  
  return (
    <Box style={style().padding(1)}>
      <vstack gap={1}>
        <Text style={style().foreground(Colors.cyan).bold().fontSize('large')}>
          UI Components Demo
        </Text>
        
        <PillTabs activeIndex={activeTab}>
          <Tab label="Lists" icon="📋" badge="3">
            <vstack gap={2}>
              <Box style={style().border('single').padding(1)}>
                <vstack gap={1}>
                  <Text style={style().foreground(Colors.green).bold()}>
                    Simple List
                  </Text>
                  <SimpleList
                    items={listItems}
                    selectedIndex={selectedListItem}
                    height={5}
                    showScrollbar
                    highlightOnFocus
                  />
                  <Text style={style().foreground(Colors.gray)}>
                    Selected: {listItems[selectedListItem.value]}
                  </Text>
                </vstack>
              </Box>
              
              <Box style={style().border('single').padding(1)}>
                <vstack gap={1}>
                  <Text style={style().foreground(Colors.green).bold()}>
                    Check List (Multi-select)
                  </Text>
                  <CheckList
                    items={['Task 1', 'Task 2', 'Task 3', 'Task 4', 'Task 5']}
                    selectedIndices={selectedCheckItems}
                    height={5}
                  />
                  <Text style={style().foreground(Colors.gray)}>
                    Selected: {selectedCheckItems.value.length} items
                  </Text>
                </vstack>
              </Box>
              
              <Box style={style().border('single').padding(1)}>
                <vstack gap={1}>
                  <Text style={style().foreground(Colors.green).bold()}>
                    Numbered List with Filter
                  </Text>
                  <NumberedList
                    items={listItems}
                    height={5}
                    showFilter
                    filterPlaceholder="Search fruits..."
                  />
                </vstack>
              </Box>
            </vstack>
          </Tab>
          
          <Tab label="Tables" icon="📊" badge="2">
            <vstack gap={2}>
              <Box style={style().border('single').padding(1)}>
                <vstack gap={1}>
                  <Text style={style().foreground(Colors.green).bold()}>
                    Data Table with Sorting
                  </Text>
                  <DataTable
                    data={tableData}
                    columns={tableColumns}
                    selectedIndex={selectedTableRow}
                    height={5}
                    showRowNumbers
                    onSelect={(row) => {
                      console.log('Selected:', row)
                    }}
                  />
                </vstack>
              </Box>
              
              <Box style={style().border('single').padding(1)}>
                <vstack gap={1}>
                  <Text style={style().foreground(Colors.green).bold()}>
                    Compact Table with Filter
                  </Text>
                  <CompactTable
                    data={tableData}
                    columns={tableColumns}
                    height={5}
                    showFilter
                    filterPlaceholder="Search employees..."
                  />
                </vstack>
              </Box>
            </vstack>
          </Tab>
          
          <Tab label="Nested Tabs" icon="🔖">
            <vstack gap={2}>
              <Text style={style().foreground(Colors.green).bold()}>
                Tabs can be nested and styled differently
              </Text>
              
              <SimpleTabs>
                <Tab label="Overview">
                  <Box style={style().padding(1)}>
                    <Text>
                      This demo showcases the re-enabled UI components:
                      List, Table, and Tabs. All components now use the
                      MVU architecture with JSX and reactive state management.
                    </Text>
                  </Box>
                </Tab>
                <Tab label="Features">
                  <vstack gap={1}>
                    <Text style={style().bold()}>List Features:</Text>
                    <Text>• Single and multi-selection</Text>
                    <Text>• Keyboard navigation</Text>
                    <Text>• Filtering and search</Text>
                    <Text>• Virtual scrolling</Text>
                    
                    <Text style={style().bold().marginTop(1)}>Table Features:</Text>
                    <Text>• Column sorting</Text>
                    <Text>• Custom cell rendering</Text>
                    <Text>• Row selection</Text>
                    <Text>• Responsive widths</Text>
                    
                    <Text style={style().bold().marginTop(1)}>Tabs Features:</Text>
                    <Text>• Icons and badges</Text>
                    <Text>• Closeable tabs</Text>
                    <Text>• Multiple styles</Text>
                    <Text>• Keyboard navigation</Text>
                  </vstack>
                </Tab>
                <Tab label="Code">
                  <Box style={style().padding(1).background(Colors.gray)}>
                    <Text style={style().fontFamily('monospace')}>
                      {`const items = ['Apple', 'Banana', 'Cherry']
const selected = $state(0)

<SimpleList
  items={items}
  selectedIndex={selected}
  height={5}
  showScrollbar
/>`}
                    </Text>
                  </Box>
                </Tab>
              </SimpleTabs>
            </vstack>
          </Tab>
        </PillTabs>
        
        <hstack gap={2} style={style().marginTop(1)}>
          <Button 
            variant="primary"
            onClick={() => {
              activeTab.value = (activeTab.value + 1) % 3
            }}
          >
            Next Tab
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              console.log('Demo completed!')
            }}
          >
            Exit Demo
          </Button>
        </hstack>
      </vstack>
    </Box>
  )
}