import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const RiskChart = () => {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ["risk-chart"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.org_id) throw new Error("No organization");

      const { data: logs } = await supabase
        .from("logs")
        .select("risk_score")
        .eq("org_id", profile.org_id);

      const buckets = { low: 0, medium: 0, high: 0, critical: 0 };
      logs?.forEach((log) => {
        if (log.risk_score < 30) buckets.low++;
        else if (log.risk_score < 70) buckets.medium++;
        else if (log.risk_score < 90) buckets.high++;
        else buckets.critical++;
      });

      return [
        { name: "Low", value: buckets.low },
        { name: "Medium", value: buckets.medium },
        { name: "High", value: buckets.high },
        { name: "Critical", value: buckets.critical },
      ];
    },
  });

  if (isLoading) {
    return (
      <Card className="p-6 glass-card border-border/50">
        <h3 className="text-lg font-semibold mb-4">Risk Distribution</h3>
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          Loading...
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 glass-card border-border/50">
      <h3 className="text-lg font-semibold mb-4">Risk Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
          <YAxis stroke="hsl(var(--muted-foreground))" />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default RiskChart;
