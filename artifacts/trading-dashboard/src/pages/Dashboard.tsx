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
  
  // Poll every 1.5 seconds to keep the dashboard live
  const { data: status, isLoading, error } = useGetEngineStatus({
    query: {
      refetchInterval: 1500,
      queryKey: getGetEngineStatusQueryKey()
    }
  })

  // Hook into the verified emergency stop endpoint
  const { mutateAsync: stopEngine } = useStopEngine()

  const handleResetSession = async () => {
    if (!window.confirm("Are you sure you want to stop the engine? This returns it to idle, and the next start will begin a fresh session with reset stats.")) return
    
    try {
      setIsResetting(true)
      await stopEngine()
    } catch (err) {
      console.error("Failed to stop engine:", err)
      alert("Error stopping engine. Please verify the backend logs.")
    } finally {
      setIsResetting(false)
    }
  }

  if (isLoading && !status) {
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
        <div className="bg-destructive/10 text-destructive p-6 rounded-xl max-w-sm w-full border border-destructive/20 shadow-sm">
          <h2 className="font-bold text-lg mb-2">Engine Unreachable</h2>
          <p className="text-sm opacity-90">Could not connect to the trading engine. Please verify the backend is running.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] pb-[88px] bg-muted/30">
      <div className="max-w-3xl mx-auto">
        <div className="p-4 sm:p-6 space-y-6">
          
          {/* Header Actions Area */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              {/* Account Balance and metrics automatically sync via status tracking */}
              <StatusHeader status={status} />
            </div>
            <div className="flex justify-end pt-2 sm:pt-0">
              <button
                onClick={handleResetSession}
                disabled={isResetting || status.state === 'idle'}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-mono tracking-wider uppercase bg-background border border-input rounded-lg hover:bg-accent hover:text-accent-foreground disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-colors"
              >
                <Square className={`h-3 w-3 ${isResetting ? 'animate-pulse text-destructive' : ''}`} />
                {isResetting ? 'Stopping...' : 'Reset to Idle'}
              </button>
            </div>
          </div>
          
          {/* Current Strategy Signal View */}
          <LiveSignal status={status} />

          {/* Configuration Form */}
          <ConfigForm config={status.config} state={status.state} />

          {/* Trade History */}
          <TradeHistory trades={status.recentTrades} />
        </div>
      </div>
      
      {/* Sticky Bottom Actions */}
      <BottomBar state={status.state} />
    </div>
  )
}