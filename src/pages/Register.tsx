import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, User, Mail, Shield, Loader2, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 20, label: "ضعيفة", color: "bg-destructive" };
  if (score === 2) return { score: 40, label: "مقبولة", color: "bg-orange-500" };
  if (score === 3) return { score: 60, label: "متوسطة", color: "bg-warning" };
  if (score === 4) return { score: 80, label: "جيدة", color: "bg-primary" };
  return { score: 100, label: "قوية", color: "bg-success" };
}

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { register, user, loading } = useAuth();
  const { toast } = useToast();

  const strength = password ? getPasswordStrength(password) : null;

  useEffect(() => {
    if (!loading && user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "الاسم مطلوب";
    if (!email.trim()) errs.email = "البريد الإلكتروني مطلوب";
    else if (!/\S+@\S+\.\S+/.test(email.trim())) errs.email = "بريد إلكتروني غير صالح";
    if (!password) errs.password = "كلمة المرور مطلوبة";
    else if (password.length < 6) errs.password = "كلمة المرور يجب أن تكون 6 أحرف على الأقل";
    if (password !== confirmPassword) errs.confirmPassword = "كلمتا المرور غير متطابقتين";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setIsLoading(true);
    const res = await register(email.trim(), password.trim(), name.trim());
    setIsLoading(false);

    if (!res.ok) {
      toast({ title: "فشل التسجيل", description: res.message, variant: "destructive" });
      return;
    }

    toast({ title: "تم إرسال الطلب", description: "تم تقديم طلب الحساب وينتظر موافقة المسؤول." });
    navigate("/login");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleRegister();
  };

  const clearError = (field: string) => setErrors(p => { const n = { ...p }; delete n[field]; return n; });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/60 rounded-full blur-[120px]" />
      </div>

      <div className="absolute top-8 left-8 flex items-center gap-3 animate-fade-in">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 border border-primary/20">
          <span className="text-primary-foreground font-black text-[10px] tracking-tighter">QMS</span>
        </div>
        <div>
          <div className="text-xl font-black text-foreground tracking-tighter">Solaris</div>
          <div className="text-[8px] text-muted-foreground font-black uppercase tracking-[0.3em] opacity-60">Enterprise Suite</div>
        </div>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-border/50 rounded-3xl overflow-hidden animate-scale-in bg-card">
        <div className="h-2 bg-gradient-to-r from-primary/60 to-primary w-full" />
        <CardHeader className="text-center pt-10 pb-6">
          <div className="mb-6 relative mx-auto w-16 h-16">
            <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl animate-pulse" />
            <div className="relative w-16 h-16 bg-gradient-to-br from-primary/70 to-primary rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/30 border border-primary/20">
              <UserPlus className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">إنشاء حساب</CardTitle>
          <CardDescription className="text-muted-foreground font-medium mt-1">طلب الوصول إلى نظام إدارة الجودة</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pb-6" onKeyDown={handleKeyDown}>
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">الاسم الكامل</Label>
            <div className="relative group">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input id="name" value={name} onChange={(e) => { setName(e.target.value); clearError('name'); }}
                placeholder="أدخل اسمك الكامل"
                className={`pl-10 h-12 rounded-xl bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all font-medium ${errors.name ? 'border-destructive' : ''}`}
              />
            </div>
            {errors.name && <p className="text-xs text-destructive flex items-center gap-1 ml-1"><AlertCircle className="w-3 h-3" /> {errors.name}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">البريد الإلكتروني</Label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input id="email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); clearError('email'); }}
                placeholder="user@organization.com"
                className={`pl-10 h-12 rounded-xl bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all font-medium ${errors.email ? 'border-destructive' : ''}`}
              />
            </div>
            {errors.email && <p className="text-xs text-destructive flex items-center gap-1 ml-1"><AlertCircle className="w-3 h-3" /> {errors.email}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">كلمة المرور</Label>
            <div className="relative group">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input id="password" type={showPassword ? "text" : "password"} value={password}
                onChange={(e) => { setPassword(e.target.value); clearError('password'); }}
                placeholder="••••••••"
                className={`pl-10 pr-10 h-12 rounded-xl bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all ${errors.password ? 'border-destructive' : ''}`}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive flex items-center gap-1 ml-1"><AlertCircle className="w-3 h-3" /> {errors.password}</p>}

            {/* Password Strength */}
            {strength && (
              <div className="space-y-1.5 px-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">قوة كلمة المرور</span>
                  <span className="text-[10px] font-bold text-muted-foreground">{strength.label}</span>
                </div>
                <Progress value={strength.score} className="h-1.5" indicatorClassName={strength.color} />
                <div className="grid grid-cols-2 gap-1 mt-1">
                  {[
                    { met: password.length >= 6, text: "6 أحرف على الأقل" },
                    { met: /[A-Z]/.test(password), text: "حرف كبير" },
                    { met: /[0-9]/.test(password), text: "رقم واحد" },
                    { met: /[^A-Za-z0-9]/.test(password), text: "رمز خاص" },
                  ].map((r, i) => (
                    <span key={i} className={`text-[10px] flex items-center gap-1 ${r.met ? 'text-success' : 'text-muted-foreground'}`}>
                      <CheckCircle2 className={`w-3 h-3 ${r.met ? 'text-success' : 'text-muted-foreground/40'}`} />
                      {r.text}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">تأكيد كلمة المرور</Label>
            <div className="relative group">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input id="confirmPassword" type="password" value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); clearError('confirmPassword'); }}
                placeholder="••••••••"
                className={`pl-10 h-12 rounded-xl bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all ${errors.confirmPassword ? 'border-destructive' : ''}`}
              />
            </div>
            {errors.confirmPassword && <p className="text-xs text-destructive flex items-center gap-1 ml-1"><AlertCircle className="w-3 h-3" /> {errors.confirmPassword}</p>}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-5 pb-10">
          <Button
            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
            onClick={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin" />
                جاري المعالجة...
              </div>
            ) : (
              <span className="tracking-wide text-sm">إرسال طلب التسجيل</span>
            )}
          </Button>

          <div className="text-center text-xs text-muted-foreground">
            لديك حساب بالفعل؟{" "}
            <button onClick={() => navigate("/login")} className="text-primary hover:underline transition-colors font-semibold">
              تسجيل الدخول
            </button>
          </div>
        </CardFooter>
      </Card>

      <div className="absolute bottom-8 text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground opacity-30">
        Solaris QMS Platform v9.0
      </div>
    </div>
  );
}
