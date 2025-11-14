import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Activity, AlertTriangle, Zap } from "lucide-react";

const Analytics = () => {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.org_id) throw new Error("No organization");

      // Fetch logs for analytics
      const { data: logs } = await supabase
        .from("logs")
        .select("*")
        .eq("org_id", profile.org_id)
        .order("created_at", { ascending: false })
        .limit(1000);

      return logs || [];
    },
  });

  // Process data for charts
  const modelDistribution = analytics?.reduce((acc: any, log: any) => {
    const model = log.model || "unknown";
    acc[model] = (acc[model] || 0) + 1;
    return acc;
  }, {});

  const modelData = Object.entries(modelDistribution || {}).map(([name, value]) => ({
    name,
    value,
  }));

  // Risk over time (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split("T")[0];
  });

  const riskOverTime = last7Days.map((date) => {
    const dayLogs = analytics?.filter((log: any) => 
      log.created_at.startsWith(date)
    ) || [];
    
    const avgRisk = dayLogs.length > 0
      ? dayLogs.reduce((sum: number, log: any) => sum + (log.risk_score || 0), 0) / dayLogs.length
      : 0;

    return {
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      risk: Math.round(avgRisk),
      count: dayLogs.length,
    };
  });

  // Risk distribution
  const riskBuckets = {
    low: analytics?.filter((log: any) => log.risk_score < 30).length || 0,
    medium: analytics?.filter((log: any) => log.risk_score >= 30 && log.risk_score < 70).length || 0,
    high: analytics?.filter((log: any) => log.risk_score >= 70).length || 0,
  };

  const riskData = [
    { name: "Low", value: riskBuckets.low, color: "hsl(var(--success))" },
    { name: "Medium", value: riskBuckets.medium, color: "hsl(var(--warning))" },
    { name: "High", value: riskBuckets.high, color: "hsl(var(--destructive))" },
  ];

  const COLORS = ["hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Analytics</h1>
        <p className="text-muted-foreground mt-1">Deep insights into your AI operations</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading analytics...</div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-6 glass-card border-border/50">
              <div className="flex items-center gap-3">
                <Activity className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Requests</p>
                  <p className="text-2xl font-bold">{analytics?.length || 0}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 glass-card border-border/50">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <div>
                  <p className="text-sm text-muted-foreground">High Risk</p>
                  <p className="text-2xl font-bold">{riskBuckets.high}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 glass-card border-border/50">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-success" />
                <div>
                  <p className="text-sm text-muted-foreground">Avg Risk Score</p>
                  <p className="text-2xl font-bold">
                    {Math.round(analytics?.reduce((sum: number, log: any) => sum + (log.risk_score || 0), 0) / (analytics?.length || 1)) || 0}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 glass-card border-border/50">
              <div className="flex items-center gap-3">
                <Zap className="h-8 w-8 text-warning" />
                <div>
                  <p className="text-sm text-muted-foreground">Models Used</p>
                  <p className="text-2xl font-bold">{Object.keys(modelDistribution || {}).length}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 glass-card border-border/50">
              <h3 className="text-lg font-semibold mb-4">Risk Trends (Last 7 Days)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={riskOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="risk" stroke="hsl(var(--primary))" strokeWidth={2} name="Avg Risk Score" />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--secondary))" strokeWidth={2} name="Request Count" />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6 glass-card border-border/50">
              <h3 className="text-lg font-semibold mb-4">Risk Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={riskData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {riskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6 glass-card border-border/50 lg:col-span-2">
              <h3 className="text-lg font-semibold mb-4">Model Usage</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={modelData}>
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
                  <Bar dataKey="value" fill="hsl(var(--primary))" name="Requests" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
