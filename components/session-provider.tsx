"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"

interface Project {
  id: string
  name: string
  universe_id: string
  place_id: string
  role: string
  owner_id: string
}

interface User {
  userId: string
  displayName: string
  profileUrl: string
  avatarUrl: string
  isGlobalAdmin: boolean
}

interface SessionContextType {
  user: User | null
  loading: boolean
  projects: Project[]
  activeProject: Project | null
  setActiveProject: (p: Project) => void
  refresh: () => Promise<void>
  refreshProjects: () => Promise<void>
  logout: () => Promise<void>
}

const SessionContext = createContext<SessionContextType>({
  user: null,
  loading: true,
  projects: [],
  activeProject: null,
  setActiveProject: () => {},
  refresh: async () => {},
  refreshProjects: async () => {},
  logout: async () => {},
})

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProject, setActiveProjectState] = useState<Project | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session")
      if (res.ok) {
        const data = await res.json()
        if (data.authenticated) {
          setUser(data.user)
        } else {
          setUser(null)
        }
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects")
      if (res.ok) {
        const data = await res.json()
        setProjects(data.projects ?? [])

        // Auto-select project from localStorage or first
        const savedId = typeof window !== "undefined" ? localStorage.getItem("nexus_active_project") : null
        const match = (data.projects ?? []).find((p: Project) => p.id === savedId)
        if (match) {
          setActiveProjectState(match)
        } else if (data.projects?.length > 0) {
          setActiveProjectState(data.projects[0])
        }
      }
    } catch {
      // silent
    }
  }, [])

  const setActiveProject = useCallback((p: Project) => {
    setActiveProjectState(p)
    if (typeof window !== "undefined") {
      localStorage.setItem("nexus_active_project", p.id)
    }
  }, [])

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    setUser(null)
    setProjects([])
    setActiveProjectState(null)
    window.location.href = "/login"
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (user) {
      refreshProjects()
    }
  }, [user, refreshProjects])

  return (
    <SessionContext.Provider value={{ user, loading, projects, activeProject, setActiveProject, refresh, refreshProjects, logout }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  return useContext(SessionContext)
}
