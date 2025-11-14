import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const RecentLogs = () => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["recent-logs"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.org_id) throw new Error("No organization");

      const { data } = await supabase
        .from("logs")
        .select("*")
        .eq("org_id", profile.org_id)
        .order("created_at", { ascending: false })
        .limit(5);

      return data;
    },
  });

  const getRiskColor = (score: number) => {
    if (score < 30) return "default";
    if (score < 70) return "secondary";
    return "destructive";
  };

  if (isLoading) {
    return (
      <Card className="p-6 glass-card border-border/50">
        <h3 className="text-lg font-semibold mb-4">Recent Logs</h3>
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      </Card>
    );
  }

  return (
    <Card className="p-6 glass-card border-border/50">
      <h3 className="text-lg font-semibold mb-4">Recent Logs</h3>
      {logs?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No logs yet
        </div>
      ) : (
        <div className="space-y-3">
          {logs?.map((log) => (
            <div
              key={log.id}
              className="p-4 rounded-lg bg-accent/20 border border-border/30 hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <p className="font-semibold text-sm">{log.model}</p>
                <Badge variant={getRiskColor(log.risk_score)}>
                  {log.risk_score}/100
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate mb-2">
                {log.prompt}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(log.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default RecentLogs;
