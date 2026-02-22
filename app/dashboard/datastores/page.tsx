"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Database,
  Search,
  Save,
  Loader2,
  RefreshCw,
  ChevronRight,
} from "lucide-react"
import { toast } from "sonner"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function DatastoresPage() {
  const [selectedStore, setSelectedStore] = useState<string | null>(null)
  const [scope, setScope] = useState("global")
  const [key, setKey] = useState("")
  const [entryData, setEntryData] = useState("")
  const [loadingEntry, setLoadingEntry] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  const { data: storesData, isLoading: storesLoading, mutate: refreshStores } = useSWR(
    "/api/datastores?action=list",
    fetcher
  )

  const datastores: { name: string }[] = storesData?.datastores ?? []

  const lookupEntry = useCallback(async () => {
    if (!selectedStore || !key) return
    setLoadingEntry(true)
    setHasLoaded(false)
    try {
      const res = await fetch(
        `/api/datastores?action=get&name=${encodeURIComponent(selectedStore)}&scope=${encodeURIComponent(scope)}&key=${encodeURIComponent(key)}`
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
  }, [selectedStore, scope, key])

  const saveEntry = async () => {
    if (!selectedStore || !key) return
    setSaving(true)
    try {
      let parsedData: unknown
      try {
        parsedData = JSON.parse(entryData)
      } catch {
        toast.error("Invalid JSON data")
        setSaving(false)
        return
      }

      const res = await fetch("/api/datastores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedStore,
          scope,
          key,
          data: parsedData,
        }),
      })
      const json = await res.json()
      if (res.ok) {
        toast.success("Entry saved successfully")
      } else {
        toast.error(json.error || "Save failed")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Datastore List */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-card-foreground">
                <Database className="h-4 w-4 text-primary" />
                Datastores
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refreshStores()}
                className="h-7 w-7 p-0"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="sr-only">Refresh</span>
              </Button>
            </div>
            <CardDescription>
              Select a datastore to browse entries.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {storesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : datastores.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No datastores found. Make sure your API key has DataStore permissions.
              </p>
            ) : (
              <div className="space-y-1 max-h-96 overflow-auto">
                {datastores.map((ds) => (
                  <button
                    key={ds.name}
                    onClick={() => {
                      setSelectedStore(ds.name)
                      setEntryData("")
                      setHasLoaded(false)
                    }}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      selectedStore === ds.name
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-accent"
                    }`}
                  >
                    <span className="font-mono text-xs truncate">{ds.name}</span>
                    {selectedStore === ds.name && (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Entry Editor */}
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-card-foreground">
              {selectedStore ? (
                <span className="flex items-center gap-2">
                  Entry Editor
                  <Badge variant="outline" className="font-mono text-xs">
                    {selectedStore}
                  </Badge>
                </span>
              ) : (
                "Entry Editor"
              )}
            </CardTitle>
            <CardDescription>
              Look up and edit datastore entries by scope and key.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground">Scope</Label>
                <Input
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  placeholder="global"
                  className="font-mono text-sm"
                  disabled={!selectedStore}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground">Entry Key</Label>
                <Input
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="Player_123456789"
                  className="font-mono text-sm"
                  disabled={!selectedStore}
                />
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={lookupEntry}
              disabled={!selectedStore || !key || loadingEntry}
            >
              {loadingEntry ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Look Up Entry
            </Button>

            <div className="space-y-1.5">
              <Label className="text-xs text-foreground">Data (JSON)</Label>
              <Textarea
                value={entryData}
                onChange={(e) => setEntryData(e.target.value)}
                placeholder={selectedStore ? '{"coins": 100, "level": 5}' : "Select a datastore first..."}
                className="min-h-48 font-mono text-xs"
                disabled={!selectedStore}
              />
            </div>

            <Button
              className="w-full gap-2"
              onClick={saveEntry}
              disabled={!selectedStore || !key || !entryData || saving || !hasLoaded}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Entry
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
