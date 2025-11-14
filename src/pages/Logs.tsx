import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import LogDetailDialog from "@/components/logs/LogDetailDialog";
import { Search } from "lucide-react";

const Logs = () => {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [modelFilter, setModelFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const { data: logs, isLoading } = useQuery({
    queryKey: ["logs", search, riskFilter, modelFilter],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.org_id) throw new Error("No organization");

      let query = supabase
        .from("logs")
        .select("*")
        .eq("org_id", profile.org_id)
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(`prompt.ilike.%${search}%,model.ilike.%${search}%`);
      }

      if (riskFilter !== "all") {
        const riskMap: Record<string, [number, number]> = {
          low: [0, 29],
          medium: [30, 69],
          high: [70, 100],
        };
        const [min, max] = riskMap[riskFilter];
        query = query.gte("risk_score", min).lte("risk_score", max);
      }

      if (modelFilter !== "all") {
        query = query.ilike("model", `%${modelFilter}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const getRiskColor = (score: number) => {
    if (score < 30) return "default";
    if (score < 70) return "secondary";
    return "destructive";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Logs</h1>
        <p className="text-muted-foreground mt-1">Browse and analyze all LLM interactions</p>
      </div>

      <Card className="p-4 glass-card border-border/50">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Risk Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risk Levels</SelectItem>
              <SelectItem value="low">Low Risk</SelectItem>
              <SelectItem value="medium">Medium Risk</SelectItem>
              <SelectItem value="high">High Risk</SelectItem>
            </SelectContent>
          </Select>

          <Select value={modelFilter} onValueChange={setModelFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Models</SelectItem>
              <SelectItem value="gpt">GPT Models</SelectItem>
              <SelectItem value="claude">Claude Models</SelectItem>
              <SelectItem value="gemini">Gemini Models</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading logs...</div>
      ) : logs?.length === 0 ? (
        <Card className="p-12 text-center glass-card">
          <h3 className="text-lg font-semibold mb-2">No logs found</h3>
          <p className="text-muted-foreground">Start sending requests to see logs appear here</p>
        </Card>
      ) : (
        <Card className="glass-card border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Prompt</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead>Flags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs?.map((log) => (
                <TableRow
                  key={log.id}
                  className="cursor-pointer hover:bg-accent/50"
                  onClick={() => setSelectedLog(log)}
                >
                  <TableCell className="font-mono text-sm">
                    {new Date(log.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-semibold">{log.model}</TableCell>
                  <TableCell className="max-w-md truncate">{log.prompt}</TableCell>
                  <TableCell>
                    <Badge variant={getRiskColor(log.risk_score)}>
                      {log.risk_score}/100
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {(log.risk_flags as string[])?.slice(0, 2).map((flag: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {flag}
                        </Badge>
                      ))}
                      {(log.risk_flags as string[])?.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{(log.risk_flags as string[]).length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {selectedLog && (
        <LogDetailDialog
          log={selectedLog}
          open={!!selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
};

export default Logs;
