"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "@/components/session-provider"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollText, Search, Loader2, Clock } from "lucide-react"

interface LogEntry {
  id: string
  user_name: string
  action: string
  details: string
  status: string
  created_at: string
}

export default function LogsPage() {
  const { activeProject } = useSession()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const fetchLogs = useCallback(async () => {
    if (!activeProject) return
    try {
      const res = await fetch(`/api/logs?projectId=${activeProject.id}`)
      if (res.ok) { const d = await res.json(); setLogs(d.logs ?? d ?? []) }
    } catch { /* */ } finally { setLoading(false) }
  }, [activeProject])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const filtered = logs.filter((l) =>
    l.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.details?.toLowerCase().includes(search.toLowerCase())
  )

  if (!activeProject) return <div className="flex items-center justify-center h-64 text-muted-foreground font-mono text-xs">NO_PROJECT_SELECTED</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-primary" />
          <h1 className="text-sm font-mono font-bold text-foreground uppercase tracking-wider">Audit Log</h1>
        </div>
        <Badge variant="outline" className="font-mono text-[10px]">{filtered.length} ENTRIES</Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 font-mono text-xs h-8" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ScrollText className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-xs font-mono text-muted-foreground">{search ? "NO_MATCHING_LOGS" : "NO_LOGS_RECORDED"}</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((log) => (
            <div key={log.id} className="border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Badge variant={log.status === "error" ? "destructive" : "outline"} className="text-[10px] font-mono h-4 px-1.5">
                    {log.action?.toUpperCase() ?? "UNKNOWN"}
                  </Badge>
                  <span className="text-xs font-mono font-medium text-foreground">{log.user_name}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                  <Clock className="h-2.5 w-2.5" />
                  {new Date(log.created_at).toLocaleString()}
                </div>
              </div>
              <p className="text-[10px] font-mono text-muted-foreground mt-1 truncate">{log.details}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
