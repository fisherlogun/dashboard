"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Database,
  Search,
  Save,
  Loader2,
  RefreshCw,
  ChevronRight,
  Key,
  List,
} from "lucide-react"
import { toast } from "sonner"
import useSWR from "swr"
import { useSession } from "@/components/session-provider"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function DatastoresPage() {
  const { activeProject } = useSession()
  const pid = activeProject?.id

  const [selectedStore, setSelectedStore] = useState<string | null>(null)
  const [scope, setScope] = useState("global")
  const [key, setKey] = useState("")
  const [entryData, setEntryData] = useState("")
  const [loadingEntry, setLoadingEntry] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [keys, setKeys] = useState<string[]>([])
  const [loadingKeys, setLoadingKeys] = useState(false)
  const [keysLoaded, setKeysLoaded] = useState(false)

  const { data: storesData, isLoading: storesLoading, mutate: refreshStores } = useSWR(
    pid ? `/api/datastores?action=list&projectId=${pid}` : null,
    fetcher
  )

  const datastores: { name: string }[] = storesData?.datastores ?? []

  const fetchKeys = useCallback(async () => {
    if (!selectedStore || !pid) return
    setLoadingKeys(true)
    setKeysLoaded(false)
    try {
      const res = await fetch(
        `/api/datastores?action=keys&projectId=${pid}&name=${encodeURIComponent(selectedStore)}&scope=${encodeURIComponent(scope)}`
      )
      const json = await res.json()
      if (res.ok) {
        setKeys((json.keys ?? []).map((k: { key: string }) => k.key))
        setKeysLoaded(true)
      } else {
        setKeys([])
        toast.error(json.error || "Failed to fetch keys")
      }
    } catch {
      setKeys([])
    } finally {
      setLoadingKeys(false)
    }
  }, [selectedStore, scope, pid])

  useEffect(() => {
    if (selectedStore) fetchKeys()
  }, [selectedStore, scope, fetchKeys])

  const lookupEntry = useCallback(async () => {
    if (!selectedStore || !key || !pid) return
    setLoadingEntry(true)
    setHasLoaded(false)
    try {
      const res = await fetch(
        `/api/datastores?action=get&projectId=${pid}&name=${encodeURIComponent(selectedStore)}&scope=${encodeURIComponent(scope)}&key=${encodeURIComponent(key)}`
      )
      const json = await res.json()
      if (res.ok) {
        setEntryData(JSON.stringify(json.data, null, 2))
        setHasLoaded(true)
      } else {
        toast.error(json.error || "Failed to fetch entry")
        setEntryData("")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setLoadingEntry(false)
    }
  }, [selectedStore, scope, key, pid])

  const saveEntry = async () => {
    if (!selectedStore || !key || !pid) return
    setSaving(true)
    try {
      let parsedData: unknown
      try { parsedData = JSON.parse(entryData) } catch { toast.error("Invalid JSON"); setSaving(false); return }

      const res = await fetch("/api/datastores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: pid, name: selectedStore, scope, key, data: parsedData }),
      })
      if (res.ok) toast.success("Entry saved")
      else toast.error((await res.json()).error || "Save failed")
    } catch {
      toast.error("Network error")
    } finally {
      setSaving(false)
    }
  }

  if (!pid) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground font-mono text-sm">
        Select a project to manage datastores
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Datastore List */}
        <div className="border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Database className="h-3 w-3 text-primary" /> Datastores
            </h3>
            <Button variant="ghost" size="sm" onClick={() => refreshStores()} className="h-6 w-6 p-0">
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
          {storesLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : datastores.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground font-mono">No datastores found</p>
          ) : (
            <div className="space-y-0.5 max-h-96 overflow-auto">
              {datastores.map((ds) => (
                <button
                  key={ds.name}
                  onClick={() => { setSelectedStore(ds.name); setEntryData(""); setHasLoaded(false); setKey("") }}
                  className={`flex w-full items-center justify-between px-2 py-1.5 text-left text-xs font-mono transition-colors ${
                    selectedStore === ds.name ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/30"
                  }`}
                >
                  <span className="truncate">{ds.name}</span>
                  {selectedStore === ds.name && <ChevronRight className="h-3 w-3 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Entry Editor */}
        <div className="border border-border bg-card p-4 space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Entry Editor</h3>
            {selectedStore && <Badge variant="outline" className="font-mono text-[10px]">{selectedStore}</Badge>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Scope</Label>
              <Input value={scope} onChange={(e) => setScope(e.target.value)} placeholder="global" className="font-mono text-xs h-8" disabled={!selectedStore} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Key</Label>
              {keysLoaded && keys.length > 0 ? (
                <Select value={key} onValueChange={(v) => setKey(v === "__custom__" ? "" : v)} disabled={!selectedStore}>
                  <SelectTrigger className="font-mono text-xs h-8"><SelectValue placeholder="Select key..." /></SelectTrigger>
                  <SelectContent>
                    {keys.map((k) => <SelectItem key={k} value={k}><span className="font-mono text-xs">{k}</span></SelectItem>)}
                    <SelectItem value="__custom__"><span className="text-xs text-muted-foreground">Custom key...</span></SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="Player_123456" className="font-mono text-xs h-8" disabled={!selectedStore} />
              )}
            </div>
          </div>

          {selectedStore && (
            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
              <span className="flex items-center gap-1"><Key className="h-2.5 w-2.5" />{loadingKeys ? "Loading..." : keysLoaded ? `${keys.length} keys` : ""}</span>
              <Button variant="ghost" size="sm" onClick={fetchKeys} disabled={loadingKeys} className="h-5 gap-1 text-[10px] px-1">
                {loadingKeys ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <List className="h-2.5 w-2.5" />} Refresh
              </Button>
            </div>
          )}

          <Button variant="outline" className="w-full gap-2 h-8 text-xs font-mono" onClick={lookupEntry} disabled={!selectedStore || !key || loadingEntry}>
            {loadingEntry ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />} Look Up
          </Button>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Data (JSON)</Label>
            <Textarea value={entryData} onChange={(e) => setEntryData(e.target.value)} placeholder='{"coins": 100}' className="min-h-40 font-mono text-xs" disabled={!selectedStore} />
          </div>

          <Button className="w-full gap-2 h-8 text-xs font-mono" onClick={saveEntry} disabled={!selectedStore || !key || !entryData || saving || !hasLoaded}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save Entry
          </Button>
        </div>
      </div>
    </div>
  )
}
