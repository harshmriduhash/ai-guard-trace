import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Key, RotateCw, Power, Copy } from "lucide-react";

interface Application {
  id: string;
  name: string;
  api_key_hash: string;
  active: boolean;
  created_at: string;
}

const Applications = () => {
  const [newAppName, setNewAppName] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: applications, isLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Application[];
    },
  });

  const createApp = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch("/api/apps/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      
      if (!response.ok) throw new Error("Failed to create application");
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedKey(data.apiKey);
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      setNewAppName("");
      toast({
        title: "Application created",
        description: "Copy your API key now - it won't be shown again!",
      });
    },
  });

  const rotateKey = useMutation({
    mutationFn: async (appId: string) => {
      const response = await fetch("/api/apps/rotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId }),
      });
      
      if (!response.ok) throw new Error("Failed to rotate key");
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedKey(data.apiKey);
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast({
        title: "Key rotated",
        description: "Copy your new API key - the old one is now invalid!",
      });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("applications")
        .update({ active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast({
        title: "Status updated",
        description: "Application status has been changed",
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "API key copied to clipboard",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Applications</h1>
          <p className="text-muted-foreground mt-1">Manage your API keys and applications</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Application
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-border/50">
            <DialogHeader>
              <DialogTitle>Create Application</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Application Name</Label>
                <Input
                  id="name"
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  placeholder="My AI App"
                  className="mt-2"
                />
              </div>

              {generatedKey && (
                <div className="p-4 glass-card border border-primary/20 rounded-lg space-y-2">
                  <Label className="text-sm text-primary">Your API Key (copy now!)</Label>
                  <div className="flex gap-2">
                    <code className="flex-1 p-2 bg-background/50 rounded text-sm font-mono break-all">
                      {generatedKey}
                    </code>
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(generatedKey)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <Button
                onClick={() => createApp.mutate(newAppName)}
                disabled={!newAppName || createApp.isPending}
                className="w-full"
              >
                {createApp.isPending ? "Creating..." : "Create Application"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading applications...</div>
      ) : applications?.length === 0 ? (
        <Card className="p-12 text-center glass-card">
          <Key className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
          <p className="text-muted-foreground mb-6">Create your first application to get started</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {applications?.map((app) => (
            <Card key={app.id} className="p-6 glass-card border-border/50 hover-glow transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold">{app.name}</h3>
                    <Badge variant={app.active ? "default" : "secondary"}>
                      {app.active ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Created {new Date(app.created_at).toLocaleDateString()}</p>
                    <p className="font-mono text-xs">ID: {app.id}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => rotateKey.mutate(app.id)}
                    disabled={rotateKey.isPending}
                    className="gap-2"
                  >
                    <RotateCw className="h-4 w-4" />
                    Rotate Key
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive.mutate({ id: app.id, active: !app.active })}
                    disabled={toggleActive.isPending}
                    className="gap-2"
                  >
                    <Power className="h-4 w-4" />
                    {app.active ? "Disable" : "Enable"}
                  </Button>
                </div>
              </div>

              {generatedKey && (
                <div className="mt-4 p-4 glass-card border border-primary/20 rounded-lg space-y-2">
                  <Label className="text-sm text-primary">New API Key (save this!)</Label>
                  <div className="flex gap-2">
                    <code className="flex-1 p-2 bg-background/50 rounded text-sm font-mono break-all">
                      {generatedKey}
                    </code>
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(generatedKey)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Applications;
