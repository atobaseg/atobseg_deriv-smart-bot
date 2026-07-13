import * as React from "react"
import { TradeRecord } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMoney } from "@/lib/utils"
import { format } from "date-fns"

export function TradeHistory({ trades }: { trades?: TradeRecord[] }) {
  // Force 'safeTrades' to be an array, even if 'trades' is null, undefined, or an object
  const safeTrades = Array.isArray(trades) ? trades : [];

  return (
    <Card>
      <CardHeader className="pb-3 border-b border-border/50">
        <CardTitle className="text-lg">Recent Trades</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* If the array is empty, show a friendly message instead of trying to map */}
        {safeTrades.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
            No trades in this session yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="font-medium p-3">Time</th>
                  <th className="font-medium p-3">Contract</th>
                  <th className="font-medium p-3 text-right">Stake</th>
                  <th className="font-medium p-3 text-right">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {safeTrades.map((trade, index) => (
                  <tr key={trade?.id || index} className="hover:bg-muted/10 transition-colors">
                    <td className="p-3 text-muted-foreground font-mono text-xs">
                      {trade?.timestamp ? format(new Date(trade.timestamp), "HH:mm:ss") : "--:--:--"}
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{trade?.contractType || "N/A"}</div>
                      <div className="text-xs text-muted-foreground font-mono">{trade?.market || "N/A"}</div>
                    </td>
                    <td className="p-3 text-right font-mono">
                      {formatMoney(trade?.stake || 0)}
                    </td>
                    <td className={`p-3 text-right font-mono font-medium ${trade?.result === 'win' ? 'text-green-600' : 'text-red-600'}`}>
                      {trade?.result === 'win' ? '+' : ''}{formatMoney(trade?.profit || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}