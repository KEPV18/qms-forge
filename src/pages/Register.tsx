import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, User, Mail, Shield, Loader2 } from "lucide-react";

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { register, user, loading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  const handleRegister = async () => {
    if (!name || !email || !password) return;
    setIsLoading(true);
    const res = await register(email.trim(), password.trim(), name.trim());
    setIsLoading(false);

    if (!res.ok) {
      toast({ title: "Registration Request Failed", description: res.message, variant: "destructive" });
      return;
    }

    toast({ title: "Clearance Requested", description: "Your account request has been submitted for admin approval." });
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Brand Background */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]" />
      </div>

      <div className="absolute top-8 left-8 flex items-center gap-3 animate-fade-in">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 border border-white/20">
          <span className="text-white font-black text-[10px] tracking-tighter">QMS</span>
        </div>
        <div>
          <div className="text-xl font-black text-foreground tracking-tighter">Solaris</div>
          <div className="text-[8px] text-muted-foreground font-black uppercase tracking-[0.3em] opacity-60">Enterprise Suite</div>
        </div>
      </div>

      <Card className="w-full max-w-md glass-card shadow-2xl border-white/10 rounded-3xl overflow-hidden animate-scale-in">
        <div className="h-2 bg-gradient-to-r from-blue-600 to-primary w-full" />
        <CardHeader className="text-center pt-10 pb-6">
          <div className="mb-6 relative mx-auto w-16 h-16">
            <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl animate-pulse" />
            <div className="relative w-16 h-16 bg-gradient-to-br from-blue-700 to-primary rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/30 border border-white/20">
              <UserPlus className="w-7 h-7 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight font-heading">Personnel Registration</CardTitle>
          <CardDescription className="text-muted-foreground font-medium mt-1">Request access to the QMS Enterprise environment</CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 pb-8">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Full Identity</Label>
            <div className="relative group">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John R. Doe"
                className="pl-10 h-12 rounded-xl bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all font-medium"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Email Coordinate</Label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="system.user@organization.com"
                className="pl-10 h-12 rounded-xl bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all font-medium"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Secret Key</Label>
            <div className="relative group">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10 h-12 rounded-xl bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-6 pb-10">
          <Button
            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
            onClick={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </div>
            ) : (
              <span className="tracking-widest uppercase text-xs">Submit Access Request</span>
            )}
          </Button>

          <div className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Already verified?{" "}
            <button
              onClick={() => navigate("/login")}
              className="text-primary hover:text-blue-400 transition-colors ml-1"
            >
              Sign In
            </button>
          </div>
        </CardFooter>
      </Card>

      <div className="absolute bottom-8 text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground opacity-30">
        Solaris Security Protocol 9.0.1
      </div>
    </div>
  );
}
