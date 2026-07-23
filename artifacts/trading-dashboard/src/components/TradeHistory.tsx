import * as React from "react";
import { TradeRecord } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";
import { format } from "date-fns";

export function TradeHistory({ trades }: { trades?: TradeRecord[] }) {
  const safeTrades = Array.isArray(trades) ? trades : [];

  return (
    <Card>
      <CardHeader className="pb-3 border-b border-border/50">
        <CardTitle className="text-lg">Recent Trades</CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        {safeTrades.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
            No trades in this session yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="p-3">Time</th>
                  <th className="p-3">Signal</th>
                  <th className="p-3">Market</th>
                  <th className="p-3 text-right">Stake</th>
                  <th className="p-3 text-right">Profit</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border/50">
                {safeTrades.map((trade) => (
                  <tr key={trade.id}>
                    <td className="p-3 font-mono text-xs">
                      {format(new Date(trade.timestamp), "HH:mm:ss")}
                    </td>

                    <td className="p-3">
                      {trade.signal}
                    </td>

                    <td className="p-3">
                      {trade.market}
                    </td>

                    <td className="p-3 text-right font-mono">
                      {formatMoney(trade.stake)}
                    </td>

                    <td
                      className={`p-3 text-right font-mono font-medium ${trade.result === "win"
                          ? "text-green-600"
                          : "text-red-600"
                        }`}
                    >
                      {trade.result === "win" ? "+" : ""}
                      {formatMoney(trade.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}