import * as React from "react"
import { AlertCircle } from "lucide-react"
import { EngineStatus } from "@workspace/api-client-react"
import { Badge } from "@/components/ui/badge"
import { formatMoney } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

export function StatusHeader({ status }: { status: EngineStatus }) {
  const {
    state,
    accountId,
    sessionPnl,
    wins,
    losses,
    successiveWins,
    successiveLosses,
    currentStake,
    stopReason,
    errorMessage,
  } = status

  const getBadgeVariant = (s: string) => {
    switch (s) {
      case "running":
        return "success"
      case "paused":
        return "warning"
      case "stopped":
        return "destructive"
      default:
        return "outline"
    }
  }

  const pnlColor = sessionPnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"

  return (
    <div className="flex flex-col gap-4">
      {errorMessage && (
        <div className="bg-destructive/10 text-destructive border-l-4 border-destructive p-3 rounded-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <p className="text-sm font-medium">{errorMessage}</p>
        </div>
      )}

      {stopReason && !errorMessage && state === 'stopped' && (
        <div className="bg-amber-500/10 text-amber-700 dark:text-amber-500 border-l-4 border-amber-500 p-3 rounded-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <p className="text-sm font-medium">{stopReason}</p>
        </div>
      )}

      <Card className="shadow-none border-t-4 border-t-primary rounded-t-none rounded-b-xl overflow-hidden">
        <CardContent className="p-5">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={getBadgeVariant(state)} className="uppercase tracking-wider px-2 py-0.5 text-[10px]">
                  {state}
                </Badge>
                {accountId && <span className="text-xs font-mono text-muted-foreground">{accountId}</span>}
              </div>
              <h2 className="text-sm text-muted-foreground font-medium">Session P&L</h2>
              <div className={`text-3xl font-bold font-mono tracking-tight ${pnlColor}`}>
                {sessionPnl > 0 ? "+" : ""}{formatMoney(sessionPnl)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-border/50">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Win / Loss</span>
              <span className="font-mono font-medium">{wins} <span className="text-muted-foreground font-sans">/</span> {losses}</span>
            </div>
            
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Current Streak</span>
              <span className="font-mono font-medium">
                {successiveWins > 0 ? (
                  <span className="text-green-600">{successiveWins} W</span>
                ) : successiveLosses > 0 ? (
                  <span className="text-red-600">{successiveLosses} L</span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Active Stake</span>
              <span className="font-mono font-medium">{formatMoney(currentStake)}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Total Trades</span>
              <span className="font-mono font-medium">{status.totalTrades}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
