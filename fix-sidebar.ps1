# Fix sidebar collapse support for 4 pages
# Run: powershell -ExecutionPolicy Bypass -File fix-sidebar.ps1

$sidebarState = @"
    const [sidebarCollapsed, setSidebarCollapsed] = useState(localStorage.getItem('sidebarCollapsed') === 'true');

    useEffect(() => {
        const handleToggle = (event: Event) => {
            const customEvent = event as CustomEvent<boolean>;
            setSidebarCollapsed(customEvent.detail);
        };
        window.addEventListener('qms-sidebar-toggle', handleToggle as EventListener);
        return () => window.removeEventListener('qms-sidebar-toggle', handleToggle as EventListener);
    }, []);
"@

$dynamicClass = '${sidebarCollapsed ? "md:ml-16" : "md:ml-64"}'

# 1. ArchivePage.tsx
$f = "src\pages\ArchivePage.tsx"
$c = Get-Content $f -Raw
$c = $c -replace 'export default function ArchivePage\(\) \{', "export default function ArchivePage() {`n$sidebarState"
$c = $c -replace 'className="flex-1 flex flex-col md:ml-64 ml-0"', "className={``flex-1 flex flex-col ml-0 transition-all duration-300 $dynamicClass``}"
$c | Set-Content $f -NoNewline
Write-Host "Fixed: ArchivePage.tsx"

# 2. RiskManagementPage.tsx
$f = "src\pages\RiskManagementPage.tsx"
$c = Get-Content $f -Raw
$c = $c -replace 'export default function RiskManagementPage\(\) \{', "export default function RiskManagementPage() {`n$sidebarState"
$c = $c -replace 'className="flex-1 flex flex-col md:ml-64 ml-0"', "className={``flex-1 flex flex-col ml-0 transition-all duration-300 $dynamicClass``}"
$c | Set-Content $f -NoNewline
Write-Host "Fixed: RiskManagementPage.tsx"

# 3. AdminAccounts.tsx
$f = "src\pages\AdminAccounts.tsx"
$c = Get-Content $f -Raw
$c = $c -replace 'export default function AdminAccounts\(\) \{', "export default function AdminAccounts() {`n$sidebarState"
$c = $c -replace 'className="md:ml-64 ml-0"', "className={``ml-0 transition-all duration-300 $dynamicClass``}"
$c | Set-Content $f -NoNewline
Write-Host "Fixed: AdminAccounts.tsx"

# 4. RecordDetail.tsx - has 3 occurrences of md:ml-64
$f = "src\pages\RecordDetail.tsx"
$c = Get-Content $f -Raw
$c = $c -replace 'export default function RecordDetail\(\) \{', "export default function RecordDetail() {`n$sidebarState"
$c = $c -replace 'className="md:ml-64 ml-0"', "className={``ml-0 transition-all duration-300 $dynamicClass``}"
$c | Set-Content $f -NoNewline
Write-Host "Fixed: RecordDetail.tsx"

Write-Host "`nAll 4 pages fixed! Run 'npm run build' to verify."
