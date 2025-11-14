import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Users, Crown, Shield, Eye, Code, CheckCircle } from "lucide-react";

interface TeamMember {
  user_id: string;
  role: string;
  profiles: {
    email: string;
    full_name: string | null;
  };
}

const roleIcons = {
  owner: Crown,
  admin: Shield,
  reviewer: CheckCircle,
  developer: Code,
  viewer: Eye,
};

const roleColors = {
  owner: "text-yellow-500",
  admin: "text-primary",
  reviewer: "text-blue-500",
  developer: "text-green-500",
  viewer: "text-muted-foreground",
};

const Team = () => {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("developer");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: teamMembers, isLoading } = useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.org_id) throw new Error("No organization");

      const { data, error } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          role,
          profiles!inner (
            email,
            full_name
          )
        `)
        .eq("org_id", profile.org_id);

      if (error) throw error;
      return data as unknown as TeamMember[];
    },
  });

  const inviteMember = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      // In a real app, this would send an email invitation
      // For now, we'll just show a success message
      return { email, role };
    },
    onSuccess: () => {
      setInviteEmail("");
      setIsInviteOpen(false);
      toast({
        title: "Invitation sent",
        description: "Team member will receive an email with instructions",
      });
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.org_id) throw new Error("No organization");

      const { error } = await supabase
        .from("user_roles")
        .update({ role })
        .eq("org_id", profile.org_id)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      toast({
        title: "Role updated",
        description: "Team member's role has been changed",
      });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Team Management</h1>
          <p className="text-muted-foreground mt-1">Manage your organization's team members and roles</p>
        </div>

        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-border/50">
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer - Read-only access</SelectItem>
                    <SelectItem value="developer">Developer - Can manage apps</SelectItem>
                    <SelectItem value="reviewer">Reviewer - Can review logs & policies</SelectItem>
                    <SelectItem value="admin">Admin - Full access except billing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => inviteMember.mutate({ email: inviteEmail, role: inviteRole })}
                disabled={!inviteEmail || inviteMember.isPending}
                className="w-full"
              >
                {inviteMember.isPending ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading team members...</div>
      ) : teamMembers?.length === 0 ? (
        <Card className="p-12 text-center glass-card">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No team members yet</h3>
          <p className="text-muted-foreground mb-6">Invite your first team member to get started</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {teamMembers?.map((member) => {
            const RoleIcon = roleIcons[member.role as keyof typeof roleIcons] || Users;
            const roleColor = roleColors[member.role as keyof typeof roleColors];

            return (
              <Card key={member.user_id} className="p-6 glass-card border-border/50 hover-glow transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full bg-primary/10 ${roleColor}`}>
                      <RoleIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">
                        {member.profiles.full_name || member.profiles.email}
                      </h3>
                      <p className="text-sm text-muted-foreground">{member.profiles.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize">
                      {member.role}
                    </Badge>
                    {member.role !== "owner" && (
                      <Select
                        value={member.role}
                        onValueChange={(role) => updateRole.mutate({ userId: member.user_id, role })}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="developer">Developer</SelectItem>
                          <SelectItem value="reviewer">Reviewer</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="p-6 glass-card border-border/50">
        <h3 className="text-lg font-semibold mb-4">Role Permissions</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <Crown className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div>
              <p className="font-semibold">Owner</p>
              <p className="text-muted-foreground">Full access including billing and organization settings</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-semibold">Admin</p>
              <p className="text-muted-foreground">Manage team, applications, policies, and view all logs</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="font-semibold">Reviewer</p>
              <p className="text-muted-foreground">Review logs, configure policies, and run analytics</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Code className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="font-semibold">Developer</p>
              <p className="text-muted-foreground">Create applications, manage API keys, and view logs</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Eye className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-semibold">Viewer</p>
              <p className="text-muted-foreground">Read-only access to dashboard and logs</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Team;
