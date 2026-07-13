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

  // Safety: If still loading, show loader
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="font-mono text-sm tracking-widest uppercase">Connecting to Engine...</p>
      </div>
    )
  }

  // Safety: If error or missing status object
  if (error || !status) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="bg-destructive/10 text-destructive p-6 rounded-xl max-w-sm w-full border border-destructive/20">
          <h2 className="font-bold text-lg mb-2">Engine Unreachable</h2>
          <p className="text-sm">Please verify the backend is running.</p>
        </div>
      </div>
    )
  }

  // Final Guard: Ensure recentTrades exists before rendering
  const safeTrades = Array.isArray(status?.recentTrades) ? status.recentTrades : [];

  return (
    <div className="min-h-[100dvh] pb-[88px] bg-muted/30">
      <div className="max-w-3xl mx-auto">
        <div className="p-4 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <StatusHeader status={status} />
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={handleResetSession}
                disabled={isResetting || status.state === 'idle'}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-mono tracking-wider uppercase bg-background border border-input rounded-lg disabled:opacity-40"
              >
                <Square className="h-3 w-3" />
                {isResetting ? 'Stopping...' : 'Reset to Idle'}
              </button>
            </div>
          </div>
          
          <LiveSignal status={status} />
          <ConfigForm config={status.config} state={status.state} />
          
          {/* Passed the pre-validated 'safeTrades' array */}
          <TradeHistory trades={safeTrades} />
        </div>
      </div>
      
      <BottomBar state={status.state} />
    </div>
  )
}