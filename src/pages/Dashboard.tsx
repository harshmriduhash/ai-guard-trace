import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MetricCard from "@/components/dashboard/MetricCard";
import RiskChart from "@/components/dashboard/RiskChart";
import RecentLogs from "@/components/dashboard/RecentLogs";
import { Activity, AlertTriangle, Layers, TrendingUp } from "lucide-react";

const Dashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
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
        .select("*")
        .eq("org_id", profile.org_id);

      const { data: apps } = await supabase
        .from("applications")
        .select("id")
        .eq("org_id", profile.org_id);

      const totalLogs = logs?.length || 0;
      const highRisk = logs?.filter((log) => log.risk_score >= 70).length || 0;
      const avgRisk = logs?.length
        ? Math.round(logs.reduce((sum, log) => sum + log.risk_score, 0) / logs.length)
        : 0;

      return {
        totalLogs,
        highRisk,
        applications: apps?.length || 0,
        avgRisk,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Monitor your AI operations in real-time</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Logs"
          value={stats?.totalLogs || 0}
          icon={Activity}
          trend="+12%"
        />
        <MetricCard
          title="High Risk Events"
          value={stats?.highRisk || 0}
          icon={AlertTriangle}
          trend="-5%"
          trendUp={false}
        />
        <MetricCard
          title="Applications"
          value={stats?.applications || 0}
          icon={Layers}
        />
        <MetricCard
          title="Avg Risk Score"
          value={stats?.avgRisk || 0}
          icon={TrendingUp}
          trend="-8%"
          trendUp={false}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RiskChart />
        <RecentLogs />
      </div>
    </div>
  );
};

export default Dashboard;
