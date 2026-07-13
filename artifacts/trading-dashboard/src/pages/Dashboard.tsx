import { useGetEngineStatus, getGetEngineStatusQueryKey, useStopEngine } from "@workspace/api-client-react"
import { StatusHeader } from "@/components/StatusHeader"
import { LiveSignal } from "@/components/LiveSignal"
import { ConfigForm } from "@/components/ConfigForm"
import { TradeHistory } from "@/components/TradeHistory"
import { BottomBar } from "@/components/BottomBar"
import { Loader2, Square } from "lucide-react"
import { useState } from "react"

export default function Dashboard() {
  const [isResetting, setIsResetting] = useState(false)
  
  const { data: status, isLoading, error } = useGetEngineStatus({
    query: {
      refetchInterval: 1500,
      queryKey: getGetEngineStatusQueryKey()
    }
  })

  const { mutateAsync: stopEngine } = useStopEngine()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="font-mono text-sm tracking-widest uppercase">Connecting to Engine...</p>
      </div>
    )
  }

  if (error || !status) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="bg-destructive/10 text-destructive p-6 rounded-xl max-w-sm w-full border border-destructive/20">
          <h2 className="font-bold text-lg mb-2">Engine Unreachable</h2>
        </div>
      </div>
    )
  }

  // DATA INTEGRITY LAYER: Force types for all child components
  const safeStatus = {
    ...status,
    recentTrades: Array.isArray(status?.recentTrades) ? status.recentTrades : [],
    // We pass empty arrays for any other fields that might be used as lists in sub-components
    // This prevents the "map is not a function" error globally
    logs: Array.isArray(status?.logs) ? status.logs : [],
    activeSignals: Array.isArray(status?.activeSignals) ? status.activeSignals : [],
    config: status.config || {},
  };

  const handleResetSession = async () => {
    if (!window.confirm("Are you sure you want to stop the engine?")) return
    try {
      setIsResetting(true)
      await stopEngine()
    } catch (err) {
      console.error("Failed to stop engine:", err)
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="min-h-[100dvh] pb-[88px] bg-muted/30">
      <div className="max-w-3xl mx-auto">
        <div className="p-4 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <StatusHeader status={safeStatus} />
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={handleResetSession}
                disabled={isResetting || safeStatus.state === 'idle'}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-mono tracking-wider uppercase bg-background border border-input rounded-lg"
              >
                <Square className="h-3 w-3" />
                {isResetting ? 'Stopping...' : 'Reset to Idle'}
              </button>
            </div>
          </div>
          
          <LiveSignal status={safeStatus} />
          <ConfigForm config={safeStatus.config} state={safeStatus.state} />
          <TradeHistory trades={safeStatus.recentTrades} />
        </div>
      </div>
      
      <BottomBar state={safeStatus.state} />
    </div>
  )
}