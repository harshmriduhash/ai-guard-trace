import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Shield, Save } from "lucide-react";

interface PolicyRules {
  blockedModels: string[];
  blockedKeywords: string[];
  maxTokens: number;
  enablePiiDetection: boolean;
  enablePromptInjectionDetection: boolean;
  enableSensitiveContentDetection: boolean;
  riskThreshold: number;
}

const Policies = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: policies, isLoading } = useQuery({
    queryKey: ["policies"],
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
        .from("policies")
        .select("*")
        .eq("org_id", profile.org_id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data?.rules as PolicyRules || {
        blockedModels: [],
        blockedKeywords: [],
        maxTokens: 4000,
        enablePiiDetection: true,
        enablePromptInjectionDetection: true,
        enableSensitiveContentDetection: true,
        riskThreshold: 70,
      };
    },
  });

  const [rules, setRules] = useState<PolicyRules>(policies || {
    blockedModels: [],
    blockedKeywords: [],
    maxTokens: 4000,
    enablePiiDetection: true,
    enablePromptInjectionDetection: true,
    enableSensitiveContentDetection: true,
    riskThreshold: 70,
  });

  const updatePolicies = useMutation({
    mutationFn: async (newRules: PolicyRules) => {
      const response = await fetch("/api/policies/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: newRules }),
      });
      
      if (!response.ok) throw new Error("Failed to update policies");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      toast({
        title: "Policies updated",
        description: "Your security policies have been saved",
      });
    },
  });

  const handleSave = () => {
    updatePolicies.mutate(rules);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Security Policies</h1>
          <p className="text-muted-foreground mt-1">Configure risk detection and content filtering rules</p>
        </div>

        <Button onClick={handleSave} disabled={updatePolicies.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {updatePolicies.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading policies...</div>
      ) : (
        <div className="space-y-6">
          <Card className="p-6 glass-card border-border/50">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Detection Settings</h2>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="pii">PII Detection</Label>
                  <p className="text-sm text-muted-foreground">Detect emails, phone numbers, SSN, credit cards</p>
                </div>
                <Switch
                  id="pii"
                  checked={rules.enablePiiDetection}
                  onCheckedChange={(checked) => setRules({ ...rules, enablePiiDetection: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="injection">Prompt Injection Detection</Label>
                  <p className="text-sm text-muted-foreground">Detect jailbreak attempts and system prompt leaks</p>
                </div>
                <Switch
                  id="injection"
                  checked={rules.enablePromptInjectionDetection}
                  onCheckedChange={(checked) => setRules({ ...rules, enablePromptInjectionDetection: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="sensitive">Sensitive Content Detection</Label>
                  <p className="text-sm text-muted-foreground">Flag harmful, violent, or inappropriate content</p>
                </div>
                <Switch
                  id="sensitive"
                  checked={rules.enableSensitiveContentDetection}
                  onCheckedChange={(checked) => setRules({ ...rules, enableSensitiveContentDetection: checked })}
                />
              </div>
            </div>
          </Card>

          <Card className="p-6 glass-card border-border/50">
            <h2 className="text-xl font-semibold mb-6">Content Filtering</h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="keywords">Blocked Keywords (comma-separated)</Label>
                <Textarea
                  id="keywords"
                  value={rules.blockedKeywords.join(", ")}
                  onChange={(e) => setRules({ 
                    ...rules, 
                    blockedKeywords: e.target.value.split(",").map(k => k.trim()).filter(Boolean)
                  })}
                  placeholder="password, secret, confidential"
                  className="mt-2"
                  rows={3}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Prompts containing these keywords will be flagged as high risk
                </p>
              </div>

              <div>
                <Label htmlFor="models">Blocked Models (comma-separated)</Label>
                <Textarea
                  id="models"
                  value={rules.blockedModels.join(", ")}
                  onChange={(e) => setRules({ 
                    ...rules, 
                    blockedModels: e.target.value.split(",").map(m => m.trim()).filter(Boolean)
                  })}
                  placeholder="gpt-4, claude-3-opus"
                  className="mt-2"
                  rows={2}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Prevent specific models from being used
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 glass-card border-border/50">
            <h2 className="text-xl font-semibold mb-6">Limits & Thresholds</h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="tokens">Max Tokens per Request</Label>
                <Input
                  id="tokens"
                  type="number"
                  value={rules.maxTokens}
                  onChange={(e) => setRules({ ...rules, maxTokens: parseInt(e.target.value) || 0 })}
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Maximum allowed tokens in a single prompt
                </p>
              </div>

              <div>
                <Label htmlFor="threshold">Risk Score Threshold (0-100)</Label>
                <Input
                  id="threshold"
                  type="number"
                  min="0"
                  max="100"
                  value={rules.riskThreshold}
                  onChange={(e) => setRules({ ...rules, riskThreshold: parseInt(e.target.value) || 0 })}
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Logs with risk scores above this will trigger alerts
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Policies;
