import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
}

const MetricCard = ({ title, value, icon: Icon, trend, trendUp = true }: MetricCardProps) => {
  return (
    <Card className="p-6 glass-card border-border/50 hover-glow transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-lg bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        {trend && (
          <span className={`text-sm font-medium ${trendUp ? "text-success" : "text-destructive"}`}>
            {trend}
          </span>
        )}
      </div>
      <h3 className="text-sm font-medium text-muted-foreground mb-1">{title}</h3>
      <p className="text-3xl font-bold">{value}</p>
    </Card>
  );
};

export default MetricCard;
