import * as React from "react"
import { EngineStatusState } from "@workspace/api-client-react"
import { useStartEngine, usePauseEngine, useStopEngine } from "@workspace/api-client-react"
import { Button } from "@/components/ui/button"
import { Play, Pause, Square } from "lucide-react"

export function BottomBar({ state }: { state?: EngineStatusState }) {
  const startEngine = useStartEngine()
  const pauseEngine = usePauseEngine()
  const stopEngine = useStopEngine()

  // Ensure state has a valid fallback to prevent undefined comparisons
  const safeState = state ?? 'idle';

  return (
    <div className="fixed bottom-0 left-0 right-0 p-3 bg-background/90 backdrop-blur-md border-t shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.3)] z-50 flex gap-2">
      <Button 
        className="flex-1 h-14 text-base font-bold shadow-sm"
        variant="success"
        disabled={safeState === 'running' || startEngine.isPending}
        onClick={() => startEngine.mutate()}
      >
        <Play className="mr-2 h-5 w-5 fill-current" />
        Start
      </Button>

      <Button 
        className="flex-1 h-14 text-base font-bold shadow-sm"
        variant={safeState === 'running' ? 'warning' : 'outline'}
        disabled={safeState !== 'running' || pauseEngine.isPending}
        onClick={() => pauseEngine.mutate()}
      >
        <Pause className="mr-2 h-5 w-5 fill-current" />
        Pause
      </Button>

      <Button 
        className="flex-1 h-14 text-base font-bold shadow-sm border-b-4 active:border-b-0 active:translate-y-1 transition-all"
        variant="destructive"
        disabled={(safeState !== 'running' && safeState !== 'paused') || stopEngine.isPending}
        onClick={() => stopEngine.mutate()}
      >
        <Square className="mr-2 h-5 w-5 fill-current" />
        Stop
      </Button>
    </div>
  )
}