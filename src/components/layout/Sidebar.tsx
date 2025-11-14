import { NavLink } from "react-router-dom";
import { Shield, LayoutDashboard, FileText, Key, Shield as ShieldIcon, BarChart3, Users } from "lucide-react";

const Sidebar = () => {
  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/logs", icon: FileText, label: "Logs" },
    { to: "/applications", icon: Key, label: "Applications" },
    { to: "/policies", icon: ShieldIcon, label: "Policies" },
    { to: "/analytics", icon: BarChart3, label: "Analytics" },
    { to: "/team", icon: Users, label: "Team" },
  ];

  return (
    <aside className="w-64 bg-card border-r border-border/50 flex flex-col">
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold gradient-text">Tracelight</h1>
            <p className="text-xs text-muted-foreground">AI Audit Platform</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`
              }
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
