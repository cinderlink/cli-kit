import { $state, $derived } from 'tuix/runes'

export interface AppState {
  theme: 'dark' | 'light' | 'matrix'
  user: {
    name: string
    email: string
    preferences: Record<string, unknown>
  } | null
  notifications: Notification[]
  isLoading: boolean
  activeRoute: string
}

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: Date
  read: boolean
}

class AppStore {
  theme = $state<'dark' | 'light' | 'matrix'>('dark')
  user = $state<AppState['user']>(null)
  notifications = $state<Notification[]>([])
  isLoading = $state(false)
  activeRoute = $state('dashboard')
  
  unreadCount = $derived(() => 
    this.notifications().filter(n => !n.read).length
  )
  
  setTheme(theme: AppState['theme']) {
    this.theme.$set(theme)
  }
  
  setUser(user: AppState['user']) {
    this.user.$set(user)
  }
  
  setLoading(isLoading: boolean) {
    this.isLoading.$set(isLoading)
  }
  
  setActiveRoute(route: string) {
    this.activeRoute.$set(route)
  }
  
  addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    }
    
    this.notifications.$update(notifications => [...notifications, newNotification])
    
    return newNotification
  }
  
  markNotificationRead(id: string) {
    this.notifications.$update(notifications =>
      notifications.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }
  
  clearNotifications() {
    this.notifications.$set([])
  }
  
  login(name: string, email: string) {
    this.setUser({
      name,
      email,
      preferences: {}
    })
    
    this.addNotification({
      type: 'success',
      title: 'Welcome!',
      message: `Successfully logged in as ${name}`
    })
  }
  
  logout() {
    this.setUser(null)
    this.clearNotifications()
  }
}

export const appStore = new AppStore()