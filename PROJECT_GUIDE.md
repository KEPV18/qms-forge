# Vezloo QMS Suite - دليل المشروع الشامل

> **آخر تحديث:** 2026-04-19
> **الإصدار:** v2.5.0
> **المسار:** `/home/kepa/qms-personal/`

---

## 1. نظرة عامة

نظام إدارة الجودة (QMS) متوافق مع ISO 9001:2015. التطبيق بيوفر أدوات كاملة لإدارة الوثائق، المراجعات، سجلات المخاطر، CAPA، خرائط العمليات، والإجراءات التشغيلية.

### التكنولوجيا
| التقنية | الاستخدام |
|---|---|
| React 18 + TypeScript | الواجهة الأمامية |
| Vite 7.3 (SWC) | البناء والتطوير |
| Tailwind CSS 3.4 + shadcn/ui | التنسيق والمكونات |
| @tanstack/react-query 5 | إدارة البيانات وcaching |
| Supabase | المصادقة + قاعدة البيانات + Realtime |
| Google Sheets API | المخزن الأساسي لبيانات QMS |
| Google Drive API | رفع وتصفح الملفات |
| Express 5.2 | خادم OAuth محلي (port 3001) |
| Vercel | النشر |

### الخطوط
- **Outfit** - خط أساسي (sans)
- **JetBrains Mono** - خط برمجي (mono)

---

## 2. هيكل الملفات

```
src/
├── App.tsx                    # التطبيق الرئيسي: providers + routing + lazy loading
├── App.css                    # أنماط التطبيق (CSS vars فقط)
├── main.tsx                   # نقطة الدخول
├── index.css                  # متغيرات الثيم: :root (فاتح) + .dark (داكن)
│
├── assets/
│   ├── logo.png               # شعار Vezloo Group
│   └── qms-logo.png           # شعار QMS Suite
│
├── integrations/
│   └── supabase/
│       ├── client.ts          # إعداد عميل Supabase (env vars)
│       └── types.ts           # أنواع قاعدة البيانات (Auto-generated)
│
├── pages/                     # ← كل الصفحات هنا
│   ├── Index.tsx               # لوحة التحكم الرئيسية (Dashboard)
│   ├── ModulePage.tsx          # صفحة الموديول (مبيعات، عمليات، جودة...)
│   ├── RecordDetail.tsx        # تفاصيل سجل واحد
│   ├── AuditPage.tsx           # لوحة المراجعة (5 تبويبات)
│   ├── ArchivePage.tsx         # أرشيف Google Drive
│   ├── RiskManagementPage.tsx  # إدارة المخاطر (3 تبويبات)
│   ├── RiskRegisterPage.tsx    # سجل المخاطر (مستقل)
│   ├── CAPARegisterPage.tsx    # سجل CAPA (مستقل)
│   ├── ProcessInteractionPage.tsx # خريطة تفاعل العمليات (مستقل)
│   ├── ActivityPage.tsx        # آخر الأنشطة
│   ├── ProceduresPage.tsx      # الإجراءات الرقمية + أرشيف Drive
│   ├── ISOManualPage.tsx       # دليل ISO 9001:2015
│   ├── ProjectsPage.tsx        # نظرة عامة على المشاريع
│   ├── ProjectDetailPage.tsx   # تفاصيل مشروع واحد
│   ├── AdminAccounts.tsx       # إدارة المستخدمين (admin فقط)
│   ├── Login.tsx               # تسجيل الدخول
│   ├── Register.tsx            # التسجيل (يحتاج موافقة admin)
│   ├── AuthCallback.tsx        # معالج OAuth callback
│   └── NotFound.tsx             # صفحة 404
│
├── hooks/                     # ← كل الـ hooks
│   ├── useAuth.tsx             # سياق المصادقة (Supabase + fallback محلي)
│   ├── useTheme.tsx            # سياق الثيم (فاتح/داكن/تلقائي)
│   ├── useQMSData.ts           # React Query لبيانات Google Sheets
│   ├── useRiskData.ts          # React Query لسجل المخاطر
│   ├── useCAPAData.ts          # React Query لسجل CAPA
│   ├── useProcessData.ts       # React Query لخرائط العمليات
│   ├── useProceduresData.ts    # حالة محلية + localStorage للإجراءات
│   ├── useManualData.ts        # حالة محلية + localStorage لدليل ISO
│   ├── useDebounce.ts          # debounce utility
│   ├── useFilter.ts            # إدارة حالة الفلترة
│   ├── useHotkeys.ts            # اختصارات لوحة المفاتيح
│   ├── use-mobile.tsx           # كشف الشاشات الصغيرة
│   ├── useNotifications.ts      # إشعارات Realtime من Supabase
│   └── use-toast.ts            # toast قديم (shadcn)
│
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx        # هيكل الصفحة: TopNav + Breadcrumbs + محتوى + Footer
│   │   ├── TopNav.tsx          # شريط التنقل العلوي
│   │   ├── Header.tsx          # Header قديم
│   │   ├── Sidebar.tsx          # Sidebar قديم (مش مستخدم حالياً)
│   │   ├── Footer.tsx           # تذييل الصفحة
│   │   ├── Breadcrumbs.tsx      # مسار التنقل
│   │   └── NotificationBell.tsx # جرس الإشعارات (Realtime)
│   │
│   ├── auth/
│   │   └── Guards.tsx          # RequireAuth + RequireRole
│   │
│   ├── dashboard/
│   │   ├── ModuleCard.tsx      # بطاقة الموديول
│   │   ├── StatusCard.tsx      # بطاقة KPI
│   │   ├── RecentActivity.tsx  # آخر الأنشطة
│   │   ├── AuditReadiness.tsx  # مؤشر جاهزية المراجعة
│   │   ├── QuickActions.tsx    # أزرار الإجراءات السريعة
│   │   └── PendingActions.tsx  # إجراءات معلقة
│   │
│   ├── records/
│   │   ├── RecordCard.tsx      # بطاقة السجل
│   │   ├── RecordBrowser.tsx   # متصفح ملفات السجل
│   │   ├── RecordsTable.tsx    # جدول/بطاقات سجلات المراجعة
│   │   ├── AddRecordModal.tsx  # نافذة إضافة سجل
│   │   ├── AddFormModal.tsx    # نافذة إضافة نموذج
│   │   ├── EditFrequencyModal.tsx  # تعديل تكرار التعبئة
│   │   └── EditMetadataModal.tsx   # تعديل بيانات السجل
│   │
│   ├── record-detail/
│   │   ├── RecordHeader.tsx    # رأس صفحة التفاصيل
│   │   ├── FileStats.tsx      # إحصائيات الملفات
│   │   ├── TechnicalSpec.tsx  # المواصفات التقنية
│   │   ├── DocumentLinks.tsx  # روابط القوالب والمجلدات
│   │   ├── CompliancePanel.tsx # لوالة حالة المراجعة
│   │   ├── ReviewPanel.tsx    # لوحة المراجع
│   │   └── RecordTimeline.tsx # خط زمني للسجل
│   │
│   ├── audit/
│   │   ├── AuditCharts.tsx     # رسوم بيانية للمراجعة
│   │   ├── AuditFilters.tsx    # فلاتر صفحة المراجعة
│   │   └── AutomatedAuditModal.tsx  # فحص مراجعة آلي (3 مراحل)
│   │
│   ├── risk/
│   │   ├── RiskRegisterTab.tsx      # جدول سجل المخاطر
│   │   ├── CapaRegisterTab.tsx      # جدول سجل CAPA
│   │   ├── ProcessInteractionTab.tsx # جدول تفاعل العمليات
│   │   ├── RiskHeatMap.tsx          # خريطة حرارية 5×5
│   │   └── RiskStats.tsx            # إحصائيات المخاطر
│   │
│   ├── settings/
│   │   └── SettingsModal.tsx   # إعدادات (حساب، مظهر، ألوان، تشخيص)
│   │
│   ├── ui/                     # 50+ مكون shadcn/ui (button, card, dialog, etc.)
│   ├── ErrorBoundary.tsx       # حد حدود الأخطاء
│   └── NavLink.tsx             # رابط تنقل
│
├── lib/                        # ← الخدمات والأدوات
│   ├── auth.ts                  # مساعد رمز OAuth
│   ├── googleSheets.ts          # خدمة Google Sheets API
│   ├── driveService.ts          # خدمة Google Drive API
│   ├── riskRegisterService.ts   # خدمة سجل المخاطر (Sheets)
│   ├── capaRegisterService.ts   # خدمة سجل CAPA (Sheets)
│   ├── processInteractionService.ts # خدمة تفاعل العمليات (Sheets)
│   ├── auditCheckService.ts     # فحص مراجعة آلي (3 مراحل)
│   ├── statusService.ts         # إدارة حالة السجلات
│   ├── ManualContent.ts         # محتوى دليل ISO 9001:2015
│   ├── ProceduresContent.ts    # محتوى الإجراءات الرقمية
│   ├── exportUtils.ts           # أدوات التصدير (CSV/DOCX)
│   ├── validation.ts            # أدوات التحقق من النماذج
│   └── utils.ts                 # cn() utility (clsx + tailwind-merge)
│
└── server/                      # خادم OAuth محلي
    └── local.js                 # Express server (port 3001)
```

---

## 3. الصفحات والمسارات

| المسار | الصفحة | الوصف |
|---|---|---|
| `/` | Dashboard | لوحة التحكم: KPIs، بطاقات الموديولات، جاهزية المراجعة |
| `/login` | Login | تسجيل الدخول (بريد/كلمة مرور + Google OAuth) |
| `/register` | Register | تسجيل حساب جديد (بانتظار موافقة admin) |
| `/auth/callback` | AuthCallback | معالج OAuth callback |
| `/module/:moduleId` | ModulePage | تفاصيل موديول (مبيعات، عمليات، جودة...) |
| `/record/*` | RecordDetail | تفاصيل سجل واحد مع لوحات المراجعة |
| `/audit` | AuditPage | لوحة المراجعة (5 تبويبات + فحص آلي) |
| `/projects` | ProjectsPage | نظرة عامة على المشاريع |
| `/project/:projectName` | ProjectDetailPage | تفاصيل مشروع واحد |
| `/archive` | ArchivePage | أرشيف ملفات Drive (استعادة/حذف) |
| `/risk-management` | RiskManagementPage | إدارة المخاطر (3 تبويبات) |
| `/risk` | RiskRegisterPage | سجل المخاطر (مستقل) |
| `/capa` | CAPARegisterPage | سجل CAPA (مستقل) |
| `/process-interaction` | ProcessInteractionPage | خريطة تفاعل العمليات (مستقل) |
| `/activity` | ActivityPage | آخر الأنشطة |
| `/procedures` | ProceduresPage | الإجراءات الرقمية + أرشيف Drive |
| `/iso-manual` | ISOManualPage | دليل ISO 9001:2015 |
| `/admin/accounts` | AdminAccounts | إدارة المستخدمين (admin فقط) |

### نظام التوجيه
- **مسارات عامة:** `/login`, `/register`, `/auth/callback`
- **مسارات محمية (RequireAuth):** كل المسارات التانية
- **مسارات admin فقط (RequireRole):** `/admin/accounts`
- كل الصفحات **lazy-loaded** عبر `React.lazy()` + `Suspense`
- ترتيب الـ Providers: `QueryClientProvider` > `ErrorBoundary` > `ThemeProvider` > `AuthProvider` > `TooltipProvider` > `BrowserRouter`

---

## 4. نظام المصادقة

### مسار تسجيل الدخول
```
مستخدم → Login.tsx → useAuth.login()
  ├── بريد/كلمة مرور → Supabase Auth (signInWithPassword)
  ├── Google OAuth → Express Proxy → Google → callback → Supabase session
  └── Fallback محلي → SHA-256 + localStorage (معطل افتراضياً)
```

### مسار التسجيل
```
مستخدم → Register.tsx → useAuth.register()
  → Supabase Auth (signUp) + profiles row (is_active: false) + user_roles row (role: "user")
  → في انتظار موافقة Admin
```

### الجداول المعنية
- **profiles**: id, email, display_name, is_active, user_id, password (legacy)
- **user_roles**: id, user_id, role (admin/moderator/user/manager/auditor)
- **notifications**: id, user_id, type, title, message, read, data (jsonb)

### الحرس (Guards)
- `RequireAuth` → يحوّل لـ `/login` لو مش مسجل دخول
- `RequireRole` → يحوّل لـ `/` لو مش عنده الصلاحية

### خادم OAuth المحلي (`server/local.js`)
- `GET /api/auth` → يبدأ Google OAuth flow
- `GET /api/auth/callback` → يستقبل callback
- `GET /api/token` → يرجع رمز OAuth المحفوظ

---

## 5. قاعدة البيانات

### Supabase (مصادقة + مستخدمين + إشعارات)
```sql
-- profiles: بيانات المستخدمين
id uuid PK, email text, display_name text, is_active boolean, user_id text, password text (legacy)

-- user_roles: صلاحيات المستخدمين
id uuid PK, user_id text, role app_role (admin|moderator|user|manager|auditor)

-- notifications: إشعارات Realtime
id uuid PK, user_id uuid, type text, title text, message text, read boolean, data jsonb
```

### Google Sheets (البيانات الرئيسية)
| الورقة | الوظيفة | المصدر |
|---|---|---|
| Data | سجلات QMS الرئيسية (35+ نموذج لكل موديول) | `VITE_SPREADSHEET_ID` |
| Risk Register | سجل المخاطر | Spreadsheet ID ثابت |
| CAPA Register | سجل الإجراءات التصحيحية | نفس Spreadsheet ID |
| Process Interaction Sheet | خريطة تفاعل العمليات | `VITE_SPREADSHEET_ID` |

> **ملاحظة مهمة:** Google Sheets هو المخزن الأساسي لبيانات QMS. Supabase بيدير بس المصادقة والملفات الشخصية والإشعارات.

---

## 6. نظام الثيم

### الثيم المتحكم (Controlled Obsidian)
- **ثيم أساسي:** داكن مع لمسات neon-cyan و neon-violet
- **نظام الألوان:** CSS variables مع `hsl(var(--*))`
- **الملف الأساسي:** `src/index.css` - فيه `:root` (فاتح) + `.dark` (داكن)
- **التبديل:** `useTheme.tsx` بيبدل class `dark`/`light` على `<html>`
- **ألوان التمييز:** 8 ألوان ممكنة، محفوظة في `localStorage.getItem('accentColor')` ومطبقة عبر `data-accent` على `<html>`
- **إعدادات الألوان:** من `SettingsModal.tsx`

### معايير التصميم
- Sidebar: `w-60` ممتد / `w-[60px]` مطوي
- هوامش الصفحة: `md:ml-[60px]` مطوي / `md:ml-60` ممتد
- أقصى عرض: `max-w-[1400px] mx-auto`
- عنوان الصفحة: `text-2xl font-bold tracking-tight`
- بطاقات: `rounded-xl` عادية / `rounded-2xl` مميزة
- كل صفحة فيها: TopNav + Breadcrumbs + Footer

---

## 7. تدفق البيانات (Data Flow)

```
Google Sheets API  →  googleSheets.ts  →  useQMSData (React Query)  →  صفحات/مكونات
Google Drive API   →  driveService.ts   →  useQMSData / استدعاءات مباشرة       →  صفحات/مكونات
Risk Sheet         →  riskRegisterService →  useRiskData (React Query)     →  صفحات المخاطر
CAPA Sheet         →  capaRegisterService →  useCAPAData (React Query)    →  صفحات CAPA
Process Sheet       →  processInteractionService →  useProcessData          →  صفحات العمليات
Supabase Auth      →  useAuth (AuthProvider)  →  Guards, Login, Register
Supabase Realtime  →  useNotifications       →  NotificationBell
LocalStorage       →  useProceduresData/useManualData →  صفحات الإجراءات والدليل
OAuth Proxy        →  server/local.js (Express)  →  getAccessToken()  →  عمليات الكتابة على Drive/Sheets
```

### عمليات القراءة والكتابة
- **قراءة Google Sheets:** API Key (للقراءة فقط)
- **كتابة Google Sheets:** OAuth access token (لازم يكون مسجل بـ Google)
- **التطبيق بيعمل تحذير** لو عمليات الكتابة فشلت بسبب عدم وجود OAuth

---

## 8. الـ Hooks

| Hook | الملف | الوظيفة |
|---|---|---|
| `useAuth` | `useAuth.tsx` | سياق المصادقة الكامل: login, logout, register, إدارة المستخدمين |
| `useTheme` | `useTheme.tsx` | سياق الثيم: فاتح/داكن/تلقائي مع localStorage |
| `useQMSData` | `useQMSData.ts` | React Query لبيانات QMS (60s refetch, 30s stale) |
| `useUpdateRecord` | `useQMSData.ts` | Mutation لتحديث خلايا Sheet |
| `useDeleteRecord` | `useQMSData.ts` | Mutation لحذف صفوف |
| `useRiskData` | `useRiskData.ts` | React Query لسجل المخاطر (إضافة/تحديث/جلب) |
| `useCAPAData` | `useCAPAData.ts` | React Query لسجل CAPA |
| `useProcessData` | `useProcessData.ts` | React Query لخرائط العمليات |
| `useProceduresData` | `useProceduresData.ts` | حالة محلية + localStorage للإجراءات |
| `useManualData` | `useManualData.ts` | حالة محلية + localStorage لدليل ISO |
| `useNotifications` | `useNotifications.ts` | إشعارات Realtime من Supabase |
| `useDebounce` | `useDebounce.ts` | debounce عام |
| `useFilter` | `useFilter.ts` | إدارة حالة الفلترة |
| `useHotkeys` | `useHotkeys.ts` | اختصارات لوحة المفاتيح |
| `use-mobile` | `use-mobile.tsx` | كشف الشاشات الصغيرة |

---

## 9. متغيرات البيئة

| المتغير | الوظيفة |
|---|---|
| `VITE_SUPABASE_URL` | رابط مشروع Supabase |
| `VITE_SUPABASE_ANON_KEY` | مفتاح Supabase العام |
| `VITE_GOOGLE_API_KEY` | مفتاح Google API (قراءة Sheets + Drive) |
| `VITE_SPREADSHEET_ID` | معرف جدول Google Sheets الرئيسي |
| `VITE_PROCEDURES_FOLDER_ID` | معرف مجلد Google Drive للإجراءات |
| `VITE_AUTH_LOCAL_DISABLED` | تعطيل المصادقة المحلية (افتراضي: "true") |
| `VITE_AUTH_SALT` | ملح تشفير كلمات المرور المحلية |
| `GOOGLE_CLIENT_ID` | معرف عميل Google OAuth (خادم) |
| `GOOGLE_CLIENT_SECRET` | سر عميل Google OAuth (خادم) |
| `GOOGLE_REDIRECT_URI` | رابط إعادة التوجيه لـ OAuth |

---

## 10. ملاحظات مهمة

### الأمان
- **لا تكتب API keys في الكود أبداً** - استخدم `import.meta.env.VITE_*`
- عمليات الكتابة على Google Sheets/Drive لازم تكون عبر OAuth
- `admin-update-password` هو Supabase Edge Function لإعادة تعيين كلمات المرور

### الفحص الآلي (Automated Audit Check)
- الملف: `src/lib/auditCheckService.ts`
- 3 مراحل: فحص سلامة السجلات، فحص تسلسل الملفات، فحص أسماء الملفات

### العلامة التجارية
- الاسم: **Vezloo QMS Suite**
- المطور: **Ahmed Khaled**
- SpreadSheet ID ثابت لـ Risk/CAPA: `11dGB-fG2UMqsdqc182PsY-K6S_19FKc8bsZLHlic18M`

### البناء
```bash
npm install && npx vite build
```

### نظام الإشعارات
- موحد على `sonner` (تم إزالة shadcn Toaster من App.tsx)
- `sonner.tsx` بيستخدم `useTheme` المحلي (مش next-themes)

---

## 11. ملفات تم تعديلها في آخر تحديث للثيم (2026-04-18)

- `src/index.css` — إعادة بناء كاملة مع ثيم فاتح/داكن
- `tailwind.config.ts` — مراجع CSS variables + ألوان الموديولات
- `src/App.css` — إزالة تعريفات Inter/hex المتعارضة
- `src/hooks/useTheme.tsx` — إزالة themeVars الميتة
- `src/components/ui/sonner.tsx` — إصلاح الاستيراد لـ useTheme المحلي
- `src/components/records/RecordCard.tsx` — استبدال كل الألوان الثابتة
- `src/pages/ProceduresPage.tsx` — مفتاح API في env var + إضافة Breadcrumbs/Footer
- `src/pages/ISOManualPage.tsx` — إضافة Breadcrumbs/Footer
- `src/pages/ActivityPage.tsx` — إضافة Breadcrumbs
- `src/pages/ProjectsPage.tsx` — توحيد التخطيط
- `src/pages/ModulePage.tsx` — توحيد التخطيط
- `src/pages/ArchivePage.tsx` — أيقونات Lucide بدل Emoji، toast → sonner
- `src/pages/AuditPage.tsx` — إصلاح ألوان emerald الثابتة
- `src/pages/AuthCallback.tsx` — إصلاح ألوان ثابتة
- `src/pages/Register.tsx` — إصلاح orange-500
- `src/components/ui/LoadingSpinner.tsx` — إصلاح مسار الاستيراد
- `src/App.tsx` — إزالة shadcn Toaster، الاحتفاظ بـ Sonner

---

> **للاستخدام:** اقرأ هذا الملف أولاً في كل محادثة جديدة عشان تفهم المشروع بسرعة بدون ما تحتاج تستكشفه من الصفر.