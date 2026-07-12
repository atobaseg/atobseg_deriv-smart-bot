import * as React from "react"
import { EngineStatus } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatPercent } from "@/lib/utils"

export function LiveSignal({ status }: { status: EngineStatus }) {
  const {
    lastTick,
    lastDigit,
    windowFillCount,
    windowSize,
    under9Confidence,
    under8Confidence,
    state
  } = status

  const isRunning = state === 'running'

  return (
    <Card className="overflow-hidden relative">
      <CardHeader className="pb-2 border-b border-border/50 bg-muted/20">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Live Signal</CardTitle>
          <div className="text-xs font-mono bg-background border px-2 py-1 rounded-md">
            {windowFillCount} <span className="text-muted-foreground">/</span> {windowSize} Ticks
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-5">
        <div className="flex justify-between items-end mb-6">
          <div>
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Last Price</div>
            <div className="text-2xl font-mono font-medium tabular-nums">
              {lastTick ? lastTick.toFixed(4) : "—"}
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Digit</div>
            <div className={`text-3xl font-mono font-bold w-10 h-10 flex items-center justify-center rounded-lg ${lastDigit !== null ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              {lastDigit !== null ? lastDigit : "-"}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-medium">
              <span>Under 9 Confidence</span>
              <span className="font-mono">{formatPercent(under9Confidence)}</span>
            </div>
            <Progress 
              value={under9Confidence ? under9Confidence * 100 : 0} 
              className="h-1.5 bg-muted"
              indicatorColor="bg-blue-500" 
            />
          </div>
          
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-medium">
              <span>Under 8 Confidence</span>
              <span className="font-mono">{formatPercent(under8Confidence)}</span>
            </div>
            <Progress 
              value={under8Confidence ? under8Confidence * 100 : 0} 
              className="h-1.5 bg-muted"
              indicatorColor="bg-purple-500" 
            />
          </div>
        </div>
      </CardContent>
      
      {/* Dimmed overlay when not running so it's clear no action is taking place */}
      {(!isRunning && state !== 'paused') && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-10 pointer-events-none">
          <div className="bg-background/90 border shadow-sm px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground tracking-wide uppercase">
            Awaiting Start
          </div>
        </div>
      )}
    </Card>
  )
}
