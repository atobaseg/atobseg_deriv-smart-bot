import { useGetEngineStatus, getGetEngineStatusQueryKey } from "@workspace/api-client-react"
import { StatusHeader } from "@/components/StatusHeader"
import { LiveSignal } from "@/components/LiveSignal"
import { ConfigForm } from "@/components/ConfigForm"
import { TradeHistory } from "@/components/TradeHistory"
import { BottomBar } from "@/components/BottomBar"
import { Loader2 } from "lucide-react"

export default function Dashboard() {
  // Poll every 1.5 seconds to keep the dashboard live
  const { data: status, isLoading, error } = useGetEngineStatus({
    query: {
      refetchInterval: 1500,
      queryKey: getGetEngineStatusQueryKey()
    }
  })

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
          {/* Main Status Header */}
          <StatusHeader status={status} />
          
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
