import { Box, Text, TextInput, Button, Select, Checkbox } from 'tuix/components'
import { $bindable, $derived, onMount } from 'tuix/runes'
import type { CommandHandler } from 'tuix/cli'

interface FormData {
  username: string
  email: string
  password: string
  confirmPassword: string
  role: 'user' | 'admin' | 'moderator'
  newsletter: boolean
  terms: boolean
}

export const FormCommand: CommandHandler = ({ options }) => {
  const { mode } = options as { mode: string }
  
  // Form fields with validation
  const username = $bindable('', {
    validate: (value) => {
      if (value.length < 3) return 'Username must be at least 3 characters'
      if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Username must be alphanumeric'
      return true
    }
  })
  
  const email = $bindable('', {
    validate: (value) => {
      if (!value) return 'Email is required'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email format'
      return true
    }
  })
  
  const password = $bindable('', {
    validate: (value) => {
      if (value.length < 8) return 'Password must be at least 8 characters'
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
        return 'Password must contain uppercase, lowercase, and number'
      }
      return true
    }
  })
  
  const confirmPassword = $bindable('')
  const role = $bindable<'user' | 'admin' | 'moderator'>('user')
  const newsletter = $bindable(false)
  const terms = $bindable(false)
  
  // Validation states
  const passwordsMatch = $derived(() => 
    password() === confirmPassword()
  )
  
  const formValid = $derived(() => {
    if (!username() || !email() || !password() || !confirmPassword()) return false
    if (!passwordsMatch()) return false
    if (!terms()) return false
    return true
  })
  
  const passwordStrength = $derived(() => {
    const pwd = password()
    if (!pwd) return 0
    let strength = 0
    if (pwd.length >= 8) strength++
    if (pwd.length >= 12) strength++
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++
    if (/\d/.test(pwd)) strength++
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++
    return strength
  })
  
  const strengthText = $derived(() => {
    const strength = passwordStrength()
    if (strength === 0) return ''
    if (strength <= 2) return 'Weak'
    if (strength <= 3) return 'Medium'
    if (strength <= 4) return 'Strong'
    return 'Very Strong'
  })
  
  const strengthColor = $derived(() => {
    const strength = passwordStrength()
    if (strength <= 2) return 'red'
    if (strength <= 3) return 'yellow'
    return 'green'
  })
  
  const handleSubmit = () => {
    if (!formValid()) return
    
    const formData: FormData = {
      username: username(),
      email: email(),
      password: password(),
      confirmPassword: confirmPassword(),
      role: role(),
      newsletter: newsletter(),
      terms: terms()
    }
    
    // In a real app, this would submit to an API
    console.log('Form submitted:', formData)
  }
  
  const handleReset = () => {
    username.$set('')
    email.$set('')
    password.$set('')
    confirmPassword.$set('')
    role.$set('user')
    newsletter.$set(false)
    terms.$set(false)
  }
  
  onMount(() => {
    if (mode === 'edit') {
      // Pre-fill form for edit mode
      username.$set('johndoe')
      email.$set('john@example.com')
      role.$set('admin')
      newsletter.$set(true)
    }
  })
  
  return (
    <Box
      direction="column"
      width="100%"
      height="100%"
      padding={2}
      borderStyle="rounded"
      borderColor="blue"
    >
      <Text bold color="blue" size="large" marginBottom={1}>
        {mode === 'edit' ? 'Edit User' : 'Create Account'}
      </Text>
      
      <Box direction="column" gap={1} flex={1}>
        <Box direction="column">
          <Text bold marginBottom={0.5}>Username</Text>
          <TextInput
            value={username}
            placeholder="Enter username"
            width={40}
          />
          {username() && username.$validate && username.$validate(username()) !== true && (
            <Text color="red" size="small">
              {username.$validate(username())}
            </Text>
          )}
        </Box>
        
        <Box direction="column">
          <Text bold marginBottom={0.5}>Email</Text>
          <TextInput
            value={email}
            placeholder="user@example.com"
            width={40}
          />
          {email() && email.$validate && email.$validate(email()) !== true && (
            <Text color="red" size="small">
              {email.$validate(email())}
            </Text>
          )}
        </Box>
        
        <Box direction="column">
          <Text bold marginBottom={0.5}>Password</Text>
          <TextInput
            value={password}
            placeholder="Enter password"
            password
            width={40}
          />
          {password() && (
            <Box direction="row" gap={1}>
              <Text size="small">Strength:</Text>
              <Text size="small" color={strengthColor()}>
                {strengthText()}
              </Text>
            </Box>
          )}
          {password() && password.$validate && password.$validate(password()) !== true && (
            <Text color="red" size="small">
              {password.$validate(password())}
            </Text>
          )}
        </Box>
        
        <Box direction="column">
          <Text bold marginBottom={0.5}>Confirm Password</Text>
          <TextInput
            value={confirmPassword}
            placeholder="Confirm password"
            password
            width={40}
          />
          {confirmPassword() && !passwordsMatch() && (
            <Text color="red" size="small">
              Passwords do not match
            </Text>
          )}
        </Box>
        
        <Box direction="column">
          <Text bold marginBottom={0.5}>Role</Text>
          <Select
            value={role}
            options={[
              { value: 'user', label: 'User' },
              { value: 'admin', label: 'Administrator' },
              { value: 'moderator', label: 'Moderator' }
            ]}
            width={40}
          />
        </Box>
        
        <Box direction="column" gap={0.5}>
          <Checkbox value={newsletter}>
            Subscribe to newsletter
          </Checkbox>
          
          <Checkbox value={terms}>
            I agree to the terms and conditions
          </Checkbox>
          {!terms() && (
            <Text color="yellow" size="small">
              You must accept the terms to continue
            </Text>
          )}
        </Box>
      </Box>
      
      <Box borderStyle="single" marginY={1} />
      
      <Box direction="row" gap={2}>
        <Button
          onClick={handleSubmit}
          variant="primary"
          disabled={!formValid()}
        >
          {mode === 'edit' ? 'Update' : 'Create Account'}
        </Button>
        
        <Button
          onClick={handleReset}
          variant="secondary"
        >
          Reset Form
        </Button>
      </Box>
      
      <Box marginTop={1}>
        <Text dim size="small">
          Press Tab to navigate • Enter to submit
        </Text>
      </Box>
    </Box>
  )
}