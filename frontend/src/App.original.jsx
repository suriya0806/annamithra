import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Store,
  Users,
  X,
  Utensils,
  Package,
  ShoppingCart,
  Plus,
  RefreshCw,
  ArrowDownToLine,
  ArrowUpFromLine,
  Trash2,
  AlertTriangle,
  ChefHat
} from "lucide-react";
import { api } from "./api";
import KitchenManagement from "./KitchenManagement";

const initialLogin = { email: "", password: "" };

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("samaya_user") || "null");
  } catch {
    return null;
  }
}

export default function App() {
  const [user, setUser] = useState(getStoredUser);
  const [authMode, setAuthMode] = useState("login");

  function handleAuth(data) {
    localStorage.setItem("samaya_token", data.token);
    localStorage.setItem("samaya_user", JSON.stringify(data.user));
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem("samaya_token");
    localStorage.removeItem("samaya_user");
    setUser(null);
  }

  if (!user) {
    return (
      <AuthScreen
        mode={authMode}
        onModeChange={setAuthMode}
        onSuccess={handleAuth}
      />
    );
  }

  return <Dashboard user={user} onLogout={logout} />;
}

function AuthScreen({ mode, onModeChange, onSuccess }) {
  const [form, setForm] = useState(
    mode === "login"
      ? initialLogin
      : {
          organizationName: "",
          organizationType: "Hotel",
          city: "",
          phone: "",
          adminName: "",
          adminEmail: "",
          password: ""
        }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(
      mode === "login"
        ? initialLogin
        : {
            organizationName: "",
            organizationType: "Hotel",
            city: "",
            phone: "",
            adminName: "",
            adminEmail: "",
            password: ""
          }
    );
    setError("");
  }, [mode]);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (mode === "login") {
        const result = await api.login(form);
        onSuccess(result);
      } else {
        await api.register(form);
        const result = await api.login({
          email: form.adminEmail,
          password: form.password
        });
        onSuccess(result);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const set = (key) => (e) =>
    setForm((current) => ({ ...current, [key]: e.target.value }));

  return (
    <div className="auth-shell">
      <div className="auth-art">
        <div className="brand-mark large">S</div>
        <div className="art-content">
          <span className="eyebrow">SAMAYA OPERATIONS</span>
          <h1>One platform for every branch.</h1>
          <p>
            Control inventory, kitchen operations, staff, orders and business
            performance from a single workspace.
          </p>
          <div className="feature-pills">
            <span>Multi-branch</span>
            <span>Role-based</span>
            <span>Real-time ready</span>
          </div>
        </div>
      </div>

      <div className="auth-panel">
        <div className="mobile-brand">
          <div className="brand-mark">S</div>
          <strong>SAMAYA</strong>
        </div>

        <div className="auth-card">
          <span className="eyebrow">{mode === "login" ? "WELCOME BACK" : "GET STARTED"}</span>
          <h2>{mode === "login" ? "Sign in to SAMAYA" : "Create your organization"}</h2>
          <p className="muted">
            {mode === "login"
              ? "Access your hotel and restaurant operations."
              : "Set up your organization and administrator account."}
          </p>

          {error && <div className="error-box">{error}</div>}

          <form onSubmit={submit} className="form-stack">
            {mode === "register" && (
              <>
                <Field label="Organization name" value={form.organizationName} onChange={set("organizationName")} placeholder="Your Hotel Group" />
                <div className="two-col">
                  <Field label="Type" value={form.organizationType} onChange={set("organizationType")} placeholder="Hotel" />
                  <Field label="City" value={form.city} onChange={set("city")} placeholder="Madurai" />
                </div>
                <Field label="Phone" value={form.phone} onChange={set("phone")} placeholder="9876543210" />
                <Field label="Admin name" value={form.adminName} onChange={set("adminName")} placeholder="Admin" />
                <Field label="Admin email" type="email" value={form.adminEmail} onChange={set("adminEmail")} placeholder="admin@example.com" />
                <Field label="Password" type="password" value={form.password} onChange={set("password")} placeholder="••••••••" />
              </>
            )}

            {mode === "login" && (
              <>
                <Field label="Email" type="email" value={form.email} onChange={set("email")} placeholder="admin@example.com" />
                <Field label="Password" type="password" value={form.password} onChange={set("password")} placeholder="••••••••" />
              </>
            )}

            <button className="primary-btn" disabled={loading}>
              {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create organization"}
              {!loading && <ChevronRight size={18} />}
            </button>
          </form>

          <button className="switch-auth" onClick={() => onModeChange(mode === "login" ? "register" : "login")}>
            {mode === "login"
              ? "New organization? Create an account"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} required />
    </label>
  );
                  <span>Quick Fill:</span>
                  <button
                    type="button"
                    style={{ background: "#e2e8f0", border: "none", borderRadius: "4px", padding: "3px 8px", cursor: "pointer", fontSize: "0.8rem", color: "#334155" }}
                    onClick={() => setForm({ email: "saravana@gmail.com", password: "SuperAdmin@123" })}
                  >
                    Org Admin (saravana)
                  </button>
                  <button
                    type="button"
                    style={{ background: "#e2e8f0", border: "none", borderRadius: "4px", padding: "3px 8px", cursor: "pointer", fontSize: "0.8rem", color: "#334155" }}
                    onClick={() => setForm({ email: "superadmin@samaya.com", password: "SuperAdmin@123" })}
                  >
                    Super Admin
                  </button>
                </div>
              </>
            )}

            <button className="primary-btn" disabled={loading}>
              {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create organization"}
              {!loading && <ChevronRight size={18} />}
            </button>
          </form>

          <button className="switch-auth" onClick={() => onModeChange(mode === "login" ? "register" : "login")}>
            {mode === "login"
              ? "New organization? Create an account"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} required />
    </label>
  );
}

function Dashboard({ user, onLogout }) {
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isSuperAdmin = user.role === "Super Admin";
  const canManageUsers = isSuperAdmin || user.role === "Organization Admin";
  const canManageBranches = user.role === "Organization Admin";

  const nav = useMemo(
    () => [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "organizations", label: "Organizations", icon: Building2, show: isSuperAdmin },
      { id: "branches", label: "Branches", icon: Building2, show: !isSuperAdmin },
      { id: "users", label: isSuperAdmin ? "All Users" : "Users", icon: Users, show: canManageUsers },
      { id: "kitchen_mgmt", label: "Kitchen & Inventory", icon: ChefHat, show: ["Super Admin", "Organization Admin", "Branch Manager", "Kitchen Manager", "Chef", "Inventory Manager"].includes(user.role) },
      { id: "inventory", label: "Inventory (Stock)", icon: Package },
      { id: "menu", label: "Menu & Recipes", icon: ClipboardList, show: ["Organization Admin", "Branch Manager", "Kitchen Manager", "Waiter", "Chef"].includes(user.role) },
      { id: "kitchen", label: "Kitchen KDS", icon: Utensils, show: ["Organization Admin", "Branch Manager", "Kitchen Manager", "Chef"].includes(user.role) },
      { id: "orders", label: "Orders", icon: ShoppingCart, show: ["Organization Admin", "Branch Manager", "Kitchen Manager", "Chef", "Waiter"].includes(user.role) },
      { id: "reports", label: "Reports", icon: BarChart3 }
    ],
    [canManageUsers]
  );

  function navigate(id) {
    setPage(id);
    setSidebarOpen(false);
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-mark">S</div>
            <div>
              <strong>SAMAYA</strong>
              <small>Operations Suite</small>
            </div>
          </div>
          <button className="icon-btn mobile-close" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="workspace-card">
          <div className="workspace-icon"><Store size={18} /></div>
          <div>
            <strong>{user.role === "Super Admin" ? "SAMAYA System" : (user.organizationName || "Organization")}</strong>
            <span>{user.role === "Super Admin" ? "All organizations" : (user.branchName || "Organization level")}</span>
          </div>
        </div>

        <nav>
          <span className="nav-label">WORKSPACE</span>
          {nav.filter((item) => item.show !== false).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-item ${page === item.id ? "active" : ""}`}
                onClick={() => navigate(item.id)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="security-note">
            <ShieldCheck size={18} />
            <div>
              <strong>Secure workspace</strong>
              <span>Role protected</span>
            </div>
          </div>
          <button className="logout-btn" onClick={onLogout}>
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="backdrop" onClick={() => setSidebarOpen(false)} />}

      <main className="main">
        <header className="topbar">
          <button className="icon-btn mobile-menu" onClick={() => setSidebarOpen(true)}>
            <Menu size={21} />
          </button>
          <div>
            <span className="topbar-kicker">SAMAYA / {page.toUpperCase()}</span>
            <h2>{pageTitle(page)}</h2>
          </div>
          <div className="profile">
            <div className="avatar">{initials(user.name)}</div>
            <div className="profile-text">
              <strong>{user.name}</strong>
              <span>{user.role}</span>
            </div>
          </div>
        </header>

        <section className="content">
          {page === "dashboard" && <DashboardHome user={user} onNavigate={navigate} />}
          {page === "organizations" && isSuperAdmin && <SuperAdminOrganizationsPage />}
          {page === "branches" && <BranchesPage canManage={canManageBranches} />}
          {page === "users" && canManageUsers && <UsersPage user={user} />}
          {page === "kitchen_mgmt" && <KitchenManagement user={user} />}
          {page === "inventory" && <InventoryPage user={user} />}
          {page === "menu" && <MenuPage user={user} />}
          {page === "kitchen" && <KitchenPage user={user} />}
          {page === "orders" && <OrdersPage user={user} />}
          {page === "reports" && <ReportsPage user={user} />}
        </section>
      </main>
    </div>
  );
}

function pageTitle(page) {
  return {
    dashboard: "Overview",
    branches: "Branch management",
    users: "User management",
    kitchen_mgmt: "Kitchen & Inventory Management",
    inventory: "Inventory",
    menu: "Menu & recipes",
    kitchen: "Kitchen display",
    orders: "Orders",
    reports: "Reports"
  }[page] || "Overview";
}

function initials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase() || "S";
}

function DashboardHome({ user, onNavigate }) {
  const cards = [
    ["Active branches", "1", "Across your organization", Building2, "branches"],
    ["Team members", "2", "Users with access", Users, "users"],
    ["Kitchen & Inventory", "Enterprise", "Full management module", ChefHat, "kitchen_mgmt"],
    ["Stock Control", "Ready", "Module workspace", Package, "inventory"],
    ["Orders", "Ready", "Operations workspace", ShoppingCart, "orders"]
  ];

  return (
    <>
      <div className="hero-card">
        <div>
          <span className="eyebrow">GOOD TO SEE YOU</span>
          <h1>Welcome, {user.name.split(" ")[0]}.</h1>
          <p>Manage your organization from one operational control center.</p>
        </div>
        <div className="hero-orbit"><Store size={42} /></div>
      </div>

      <div className="stat-grid">
        {cards.map(([title, value, sub, Icon, target]) => (
          <button key={title} className="stat-card" onClick={() => onNavigate(target)}>
            <div className="stat-head">
              <span>{title}</span>
              <div className="stat-icon"><Icon size={19} /></div>
            </div>
            <strong>{value}</strong>
            <small>{sub}</small>
          </button>
        ))}
      </div>

      <div className="section-grid">
        <div className="panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">OPERATIONS</span>
              <h3>Daily control center</h3>
            </div>
            <ClipboardList size={20} />
          </div>
          <div className="operation-list">
            <Operation label="Inventory tracking" text="Opening, received, usage and wastage" icon={Package} />
            <Operation label="Kitchen workflow" text="Recipes and preparation queue" icon={Utensils} />
            <Operation label="Order management" text="Orders and branch sales" icon={ShoppingCart} />
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">ACCESS</span>
              <h3>Your workspace</h3>
            </div>
            <ShieldCheck size={20} />
          </div>
      `This will permanently delete organization "${organization.name}" and all related branches, users, inventory, menu, recipes, orders and records.\n\nType the exact organization name to continue:`
    );

    if (confirmation === null) {
      return;
    }

    // Compare normalized names so accidental leading/trailing spaces
    // or capitalization do not cause a false mismatch.
    const enteredName = confirmation.trim().toLowerCase();
    const actualName = String(organization.name ?? "").trim().toLowerCase();

    if (enteredName !== actualName) {
      setError(`Organization name did not match. Please enter exactly: ${organization.name}`);
      return;
    }

    setError("");

    try {
      await api.deleteOrganization(organization.id);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="page-grid">
      <div className="page-intro">
        <div>
          <span className="eyebrow">SYSTEM ADMINISTRATION</span>
          <h1>Organizations</h1>
          <p>Global view of every organization registered in SAMAYA.</p>
        </div>
        <button className="secondary-btn compact" onClick={load}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {loading ? (
        <div className="panel empty-row">Loading organizations...</div>
      ) : (
        <div className="panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Type</th>
                  <th>City</th>
                  <th>Branches</th>
                  <th>Users</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map(o => (
                  <tr key={o.id}>
                    <td><strong>{o.name}</strong><span>{o.phone}</span></td>
                    <td>{o.type}</td>
                    <td>{o.city}</td>
                    <td>{o.branchCount}</td>
                    <td>{o.userCount}</td>
                    <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="danger-btn compact"
                        onClick={() => deleteOrganization(o)}
                      >
                        Delete organization
                      </button>
                    </td>
                  </tr>
                ))}
                {organizations.length === 0 && (
                  <tr><td colSpan={7}><div className="empty-row">No organizations found.</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


function ReportsPage({ user }) {
  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(user.branchId ? String(user.branchId) : "");
  const [days, setDays] = useState(7);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true); setError("");
    try {
      const from = new Date(); from.setHours(0,0,0,0); from.setDate(from.getDate() - (Number(days) - 1));
      const to = new Date(); to.setHours(0,0,0,0);
      const [s, d, b] = await Promise.all([
        api.getReportSummary({ branchId: branchId || undefined, from: from.toISOString(), to: to.toISOString() }),
        api.getDailySales(branchId || undefined, Number(days)),
        api.getBranches()
      ]);
      setSummary(s); setDaily(d); setBranches(b);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [branchId, days]);

  return <div className="page-grid">
    <div className="page-intro">
      <div><span className="eyebrow">BUSINESS INTELLIGENCE</span><h1>Reports & Analytics</h1><p>Live reports calculated from orders, sales and inventory transactions.</p></div>
      <button className="secondary-btn compact" onClick={load}><RefreshCw size={16}/> Refresh</button>
    </div>
    {error && <div className="error-box">{error}</div>}
    {!user.branchId && <div className="branch-filter panel"><div><span className="eyebrow">SCOPE</span><strong>Branch</strong></div><select value={branchId} onChange={e=>setBranchId(e.target.value)}><option value="">All branches</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select><select value={days} onChange={e=>setDays(e.target.value)}><option value="7">Last 7 days</option><option value="14">Last 14 days</option><option value="30">Last 30 days</option></select></div>}
    {loading ? <div className="panel empty-row">Loading live report...</div> : summary && <>
      <div className="stat-grid">
        <div className="stat-card"><div className="stat-head"><span>Sales</span><div className="stat-icon"><BarChart3 size={19}/></div></div><strong>₹{Number(summary.sales).toFixed(2)}</strong><small>Served orders</small></div>
        <div className="stat-card"><div className="stat-head"><span>Orders</span><div className="stat-icon"><ShoppingCart size={19}/></div></div><strong>{summary.totalOrders}</strong><small>{summary.pendingOrders} active</small></div>
        <div className="stat-card"><div className="stat-head"><span>Inventory usage</span><div className="stat-icon"><Package size={19}/></div></div><strong>{Number(summary.usage).toFixed(3)}</strong><small>Total usage units</small></div>
        <div className="stat-card"><div className="stat-head"><span>Wastage</span><div className="stat-icon"><Trash2 size={19}/></div></div><strong>{Number(summary.wastage).toFixed(3)}</strong><small>Recorded wastage units</small></div>
      </div>
      <div className="section-grid">
        <div className="panel"><div className="panel-head"><div><span className="eyebrow">SALES TREND</span><h3>Daily sales</h3></div><BarChart3 size={20}/></div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Orders</th><th>Sales</th></tr></thead><tbody>{daily.map(x=><tr key={x.date}><td>{x.date}</td><td>{x.orders}</td><td>₹{Number(x.sales).toFixed(2)}</td></tr>)}</tbody></table></div></div>
        <div className="panel"><div className="panel-head"><div><span className="eyebrow">TOP SELLERS</span><h3>Menu performance</h3></div><Utensils size={20}/></div>{summary.topItems.length===0?<div className="empty-row">No served sales yet.</div>:<div className="table-wrap"><table><thead><tr><th>Food</th><th>Qty</th><th>Sales</th></tr></thead><tbody>{summary.topItems.map(x=><tr key={x.name}><td><strong>{x.name}</strong></td><td>{x.quantity}</td><td>₹{Number(x.sales).toFixed(2)}</td></tr>)}</tbody></table></div>}</div>
      </div>
      <div className="panel"><div className="panel-head"><div><span className="eyebrow">OPERATIONS</span><h3>Report summary</h3></div><ClipboardList size={20}/></div><div className="access-box"><div><span>Served orders</span><strong>{summary.servedOrders}</strong></div><div><span>Average order</span><strong>₹{Number(summary.averageOrder).toFixed(2)}</strong></div><div><span>Stock received/opening</span><strong>{Number(summary.stockIn).toFixed(3)}</strong></div></div></div>
    </>}
  </div>;
}

function ComingSoon({ title, description, icon: Icon }) {
  return (
    <div className="empty-module">
      <div className="empty-icon"><Icon size={30} /></div>
      <span className="eyebrow">NEXT MODULE</span>
      <h1>{title}</h1>
      <p>{description}</p>
      <span className="module-badge">Backend foundation connected</span>
    </div>
  );
}

function BranchesPage({ canManage }) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", code: "", address: "", city: "", phone: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    try {
      setBranches(await api.getBranches());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await api.createBranch(form);
      setForm({ name: "", code: "", address: "", city: "", phone: "" });
      setMessage("Branch created successfully.");
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="page-grid">
      <div className="page-intro">
        <div>
          <span className="eyebrow">ORGANIZATION</span>
          <h1>Branches</h1>
          <p>Manage the physical locations connected to your organization.</p>
        </div>
        <span className="count-chip">{branches.length} branch{branches.length !== 1 ? "es" : ""}</span>
      </div>

      {canManage && (
        <div className="panel form-panel">
          <div className="panel-head">
            <div><span className="eyebrow">CREATE</span><h3>Add branch</h3></div>
          </div>
          {error && <div className="error-box">{error}</div>}
          {message && <div className="success-box">{message}</div>}
          <form className="form-grid" onSubmit={create}>
            <Field label="Branch name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Madurai Main Branch" />
            <Field label="Branch code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="MAD001" />
            <Field label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Branch address" />
            <Field label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Madurai" />
            <Field label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="9876543210" />
            <div className="form-action"><button className="primary-btn compact">Create branch <ChevronRight size={17} /></button></div>
          </form>
        </div>
      )}

      <div className="panel">
        <div className="panel-head">
          <div><span className="eyebrow">LOCATIONS</span><h3>Branch directory</h3></div>
          <Building2 size={20} />
        </div>
        {loading ? <div className="loading">Loading branches...</div> : branches.length === 0 ? <div className="empty-row">No branches yet.</div> :
          <div className="table-wrap">
            <table>
              <thead><tr><th>Branch</th><th>Code</th><th>City</th><th>Phone</th><th>Status</th></tr></thead>
              <tbody>{branches.map((b) => (
                <tr key={b.id}>
                  <td><strong>{b.name}</strong><span>{b.address}</span></td>
                  <td><span className="code-chip">{b.code}</span></td>
                  <td>{b.city}</td>
                  <td>{b.phone}</td>
                  <td><span className="status active">Active</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        }
      </div>
    </div>
  );
}

function UsersPage({ user }) {
  const isSuperAdmin = user.role === "Super Admin";
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [organizationId, setOrganizationId] = useState("");
  const [form, setForm] = useState({
    organizationId: "",
    name: "",
    email: "",
    password: "",
    roleId: 3,
    branchId: ""
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    try {
      setError("");

      const [u, r, b] = await Promise.all([
        api.getUsers(isSuperAdmin ? (organizationId || undefined) : undefined),
        api.getRoles(),
        api.getBranches()
      ]);

      setUsers(u);
      setRoles(r);
      setBranches(b);

      if (isSuperAdmin) {
        const orgs = await api.getOrganizations();
        setOrganizations(orgs);

        if (!form.organizationId && orgs.length) {
          setForm(f => ({ ...f, organizationId: String(orgs[0].id) }));
        }
      }

      if (r.length && !form.roleId) {
        setForm(f => ({
          ...f,
          roleId: r.find(x => x.name === "Branch Manager")?.id || r[0].id
        }));
      }
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, [organizationId, isSuperAdmin]);

  async function create(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      await api.createUser({
        organizationId: isSuperAdmin
          ? Number(form.organizationId)
          : undefined,
        name: form.name,
        email: form.email,
        password: form.password,
        roleId: Number(form.roleId),
        branchId: form.branchId
          ? Number(form.branchId)
          : null
      });

      setForm(f => ({
        ...f,
        name: "",
        email: "",
        password: ""
      }));

      setMessage("User created successfully.");
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function deleteUser(userToDelete) {
    const confirmed = window.confirm(
      `Delete the login for ${userToDelete.name} (${userToDelete.email})?\n\n` +
      "If the account has historical records, SAMAYA will deactivate the login and preserve those records."
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const result = await api.deleteUser(userToDelete.id);
      setMessage(result.message);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="page-grid">
      <div className="page-intro">
        <div>
          <span className="eyebrow">
            {isSuperAdmin ? "SYSTEM ACCESS CONTROL" : "ACCESS CONTROL"}
          </span>
          <h1>{isSuperAdmin ? "All Users" : "Users"}</h1>
          <p>
            {isSuperAdmin
              ? "View and control login accounts across every organization."
              : "Create and manage users inside your organization."}
          </p>
        </div>
        <span className="count-chip">{users.length} users</span>
      </div>

      {error && <div className="error-box">{error}</div>}
      {message && <div className="success-box">{message}</div>}

      <div className="panel form-panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">CREATE</span>
            <h3>Add user</h3>
          </div>
          <Users size={20} />
        </div>

        <form className="form-grid" onSubmit={create}>
          {isSuperAdmin && (
            <label className="field">
              <span>Organization</span>
              <select
                value={form.organizationId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    organizationId: e.target.value,
                    branchId: ""
                  })
                }
                required
              >
                <option value="">Select organization</option>
                {organizations.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <Field
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Branch Manager"
          />

          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="manager@example.com"
          />

          <Field
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
          />

          <label className="field">
            <span>Role</span>
            <select
              value={form.roleId}
              onChange={(e) =>
                setForm({ ...form, roleId: e.target.value })
              }
            >
              {roles.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Branch</span>
            <select
              value={form.branchId}
              onChange={(e) =>
                setForm({ ...form, branchId: e.target.value })
              }
            >
              <option value="">Organization level</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>

          <div className="form-action">
            <button className="primary-btn compact">
              Create user <ChevronRight size={17} />
            </button>
          </div>
        </form>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">DIRECTORY</span>
            <h3>{isSuperAdmin ? "All organization users" : "Organization users"}</h3>
          </div>

          {isSuperAdmin && (
            <select
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              className="compact-select"
            >
              <option value="">All organizations</option>
              {organizations.map(o => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                {isSuperAdmin && <th>Organization</th>}
                <th>Role</th>
                <th>Branch</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.name}</strong>
                    <span>{u.email}</span>
                  </td>

                  {isSuperAdmin && (
                    <td>{u.organizationName || "—"}</td>
                  )}

                  <td>
                    <span className="role-chip">{u.role}</span>
                  </td>

                  <td>
                    {u.branchName || "Organization level"}
                  </td>

                  <td>
                    <span
                      className={`status ${
                        u.isActive ? "active" : "inactive"
                      }`}
                    >
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td>
                    {u.id === user.id ? (
                      <span className="muted">Current account</span>
                    ) : (
                      <button
                        className="danger-btn compact"
                        onClick={() => deleteUser(u)}
                      >
                        <Trash2 size={15} />
                        Delete login
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td colSpan={isSuperAdmin ? 6 : 5}>
                    <div className="empty-row">No users found.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InventoryPage({ user }) {
  const isOrgAdmin = user.role === "Organization Admin";
  const canManageItems = ["Organization Admin", "Branch Manager", "Inventory Manager", "Kitchen Manager"].includes(user.role);
  const canTransact = ["Organization Admin", "Branch Manager", "Inventory Manager", "Kitchen Manager", "Chef", "Staff"].includes(user.role);

  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(user.branchId ? String(user.branchId) : "");
  const [items, setItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ totalItems: 0, lowStock: 0, stockValueUnits: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showItemForm, setShowItemForm] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [itemForm, setItemForm] = useState({ branchId: user.branchId ? String(user.branchId) : "", name: "", category: "", unit: "KG", minimumStock: "", openingStock: "", reference: "" });
  const [transactionForm, setTransactionForm] = useState({ inventoryItemId: "", type: "StockIn", quantity: "", reference: "", notes: "" });

  const activeBranch = user.branchId ? String(user.branchId) : selectedBranch;

  async function load() {
    setLoading(true);
    setError("");
    try {
      const branchParam = activeBranch ? Number(activeBranch) : undefined;
      const [i, t, s, b] = await Promise.all([
        api.getInventoryItems(branchParam),
        api.getInventoryTransactions(branchParam),
        api.getInventorySummary(branchParam),
        api.getBranches()
      ]);
      setItems(i);
      setTransactions(t);
      setSummary(s);
      setBranches(b);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [activeBranch]);

  function clearMessages() {
    setError("");
    setMessage("");
  }

  async function createItem(e) {
    e.preventDefault();
    clearMessages();
    try {
      await api.createInventoryItem({
        branchId: user.branchId ? Number(user.branchId) : Number(itemForm.branchId),
        name: itemForm.name,
        category: itemForm.category || "General",
        unit: itemForm.unit,
        minimumStock: Number(itemForm.minimumStock || 0),
        openingStock: Number(itemForm.openingStock || 0),
        reference: itemForm.reference || null
      });
      setItemForm({ branchId: user.branchId ? String(user.branchId) : activeBranch, name: "", category: "", unit: "KG", minimumStock: "", openingStock: "", reference: "" });
      setMessage("Inventory item added successfully.");
      setShowItemForm(false);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function createTransaction(e) {
    e.preventDefault();
    clearMessages();
    try {
      await api.createInventoryTransaction({
        inventoryItemId: Number(transactionForm.inventoryItemId),
        type: transactionForm.type,
        quantity: Number(transactionForm.quantity),
        reference: transactionForm.reference || null,
        notes: transactionForm.notes || null
      });
      setTransactionForm({ inventoryItemId: "", type: "StockIn", quantity: "", reference: "", notes: "" });
      setMessage("Stock transaction recorded successfully.");
      setShowTransactionForm(false);
      await load();

  function clearMessages() {
    setError("");
    setMessage("");
  }

  async function createItem(e) {
    e.preventDefault();
    clearMessages();
    try {
      await api.createInventoryItem({
        branchId: user.branchId ? Number(user.branchId) : Number(itemForm.branchId),
        name: itemForm.name,
        category: itemForm.category || "General",
        unit: itemForm.unit,
        minimumStock: Number(itemForm.minimumStock || 0),
        openingStock: Number(itemForm.openingStock || 0),
        reference: itemForm.reference || null
      });
      setItemForm({ branchId: user.branchId ? String(user.branchId) : activeBranch, name: "", category: "", unit: "KG", minimumStock: "", openingStock: "", reference: "" });
      setMessage("Inventory item added successfully.");
      setShowItemForm(false);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function createTransaction(e) {
    e.preventDefault();
    clearMessages();
    try {
      await api.createInventoryTransaction({
        inventoryItemId: Number(transactionForm.inventoryItemId),
        type: transactionForm.type,
        quantity: Number(transactionForm.quantity),
        reference: transactionForm.reference || null,
        notes: transactionForm.notes || null
      });
      setTransactionForm({ inventoryItemId: "", type: "StockIn", quantity: "", reference: "", notes: "" });
      setMessage("Stock transaction recorded successfully.");
      setShowTransactionForm(false);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="page-grid">
      <div className="page-intro inventory-intro">
        <div>
          <span className="eyebrow">STOCK CONTROL</span>
          <h1>Inventory</h1>
          <p>{user.branchName ? `Managing stock for ${user.branchName}.` : "Manage stock branch by branch from your organization workspace."}</p>
        </div>
        <div className="inventory-actions">
          <button className="secondary-btn" onClick={load}><RefreshCw size={17} /> Refresh</button>
          {canTransact && <button className="secondary-btn" onClick={() => { clearMessages(); setShowTransactionForm(v => !v); }}><ArrowDownToLine size={17} /> Stock movement</button>}
          {canManageItems && <button className="primary-btn compact" onClick={() => { clearMessages(); setShowItemForm(v => !v); }}><Plus size={17} /> Add item</button>}
        </div>
      </div>

      {isOrgAdmin && (
        <div className="branch-filter panel">
          <div>
            <span className="eyebrow">BRANCH SCOPE</span>
            <strong>Select inventory branch</strong>
          </div>
          <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
            <option value="">All branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
          </select>
        </div>
      )}

      {error && <div className="error-box">{error}</div>}
      {message && <div className="success-box">{message}</div>}

      <div className="inventory-stat-grid">
        <div className="stat-card inventory-stat"><span>Total items</span><strong>{summary.totalItems}</strong><small>Active inventory items</small></div>
        <div className="stat-card inventory-stat"><span>Low stock</span><strong>{summary.lowStock}</strong><small>At or below minimum</small></div>
        <div className="stat-card inventory-stat"><span>Current quantity</span><strong>{Number(summary.stockValueUnits || 0).toFixed(2)}</strong><small>Across selected scope</small></div>
      </div>

      {showItemForm && canManageItems && (
        <div className="panel form-panel">
          <div className="panel-head"><div><span className="eyebrow">CREATE</span><h3>Add inventory item</h3></div><Package size={20} /></div>
          <form className="form-grid" onSubmit={createItem}>
            {!user.branchId && <label className="field"><span>Branch</span><select required value={itemForm.branchId} onChange={e => setItemForm({ ...itemForm, branchId: e.target.value })}><option value="">Select branch</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
            <Field label="Item name" value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} placeholder="Chicken" />
            <Field label="Category" value={itemForm.category} onChange={e => setItemForm({ ...itemForm, category: e.target.value })} placeholder="Meat" />
            <label className="field"><span>Unit</span><select value={itemForm.unit} onChange={e => setItemForm({ ...itemForm, unit: e.target.value })}><option>KG</option><option>G</option><option>L</option><option>ML</option><option>PCS</option><option>BOX</option><option>PACK</option></select></label>
            <Field label="Minimum stock" type="number" min="0" step="0.001" value={itemForm.minimumStock} onChange={e => setItemForm({ ...itemForm, minimumStock: e.target.value })} placeholder="10" />
            <Field label="Opening stock" type="number" min="0" step="0.001" value={itemForm.openingStock} onChange={e => setItemForm({ ...itemForm, openingStock: e.target.value })} placeholder="50" />
            <Field label="Reference" value={itemForm.reference} onChange={e => setItemForm({ ...itemForm, reference: e.target.value })} placeholder="Opening count / invoice no." />
            <div className="form-action"><button className="primary-btn compact">Save item <ChevronRight size={17} /></button></div>
          </form>
        </div>
      )}

      {showTransactionForm && canTransact && (
        <div className="panel form-panel">
          <div className="panel-head"><div><span className="eyebrow">STOCK MOVEMENT</span><h3>Record stock</h3></div><ArrowUpFromLine size={20} /></div>
          <form className="form-grid" onSubmit={createTransaction}>
            <label className="field"><span>Item</span><select required value={transactionForm.inventoryItemId} onChange={e => setTransactionForm({ ...transactionForm, inventoryItemId: e.target.value })}><option value="">Select item</option>{items.map(i => <option key={i.id} value={i.id}>{i.name} — {i.currentStock} {i.unit}</option>)}</select></label>
            <label className="field"><span>Movement</span><select value={transactionForm.type} onChange={e => setTransactionForm({ ...transactionForm, type: e.target.value })}><option value="StockIn">Stock In</option><option value="StockOut">Stock Out</option><option value="Usage">Usage</option><option value="Wastage">Wastage</option><option value="Adjustment">Set Adjustment</option></select></label>
            <Field label="Quantity" type="number" min="0.001" step="0.001" value={transactionForm.quantity} onChange={e => setTransactionForm({ ...transactionForm, quantity: e.target.value })} placeholder="5" />
            <Field label="Reference" value={transactionForm.reference} onChange={e => setTransactionForm({ ...transactionForm, reference: e.target.value })} placeholder="Invoice / production no." />
            <Field label="Notes" value={transactionForm.notes} onChange={e => setTransactionForm({ ...transactionForm, notes: e.target.value })} placeholder="Optional note" />
            <div className="form-action"><button className="primary-btn compact">Record movement <ChevronRight size={17} /></button></div>
          </form>
        </div>
      )}

      <div className="panel">
        <div className="panel-head"><div><span className="eyebrow">CURRENT STOCK</span><h3>Inventory items</h3></div><Package size={20} /></div>
        {loading ? <div className="loading">Loading inventory...</div> : items.length === 0 ? <div className="empty-row">No inventory items in this branch yet. Use <strong>Add item</strong> to create the first item.</div> :
          <div className="table-wrap"><table><thead><tr><th>Item</th><th>Branch</th><th>Category</th><th>Current</th><th>Minimum</th><th>Status</th></tr></thead><tbody>
            {items.map(i => <tr key={i.id}><td><strong>{i.name}</strong><span>{i.unit}</span></td><td>{i.branchName}</td><td>{i.category}</td><td><strong>{Number(i.currentStock).toFixed(3)}</strong> {i.unit}</td><td>{Number(i.minimumStock).toFixed(3)} {i.unit}</td><td><span className={`status ${i.lowStock ? "inactive" : "active"}`}>{i.lowStock ? "Low stock" : "Healthy"}</span></td></tr>)}
          </tbody></table></div>
        }
      </div>

      <div className="panel">
        <div className="panel-head"><div><span className="eyebrow">AUDIT TRAIL</span><h3>Recent stock movements</h3></div><ClipboardList size={20} /></div>
        {transactions.length === 0 ? <div className="empty-row">No stock movements yet.</div> :
          <div className="table-wrap"><table><thead><tr><th>Time</th><th>Item</th><th>Movement</th><th>Qty</th><th>After</th><th>By</th></tr></thead><tbody>
            {transactions.slice(0, 50).map(t => <tr key={t.id}><td>{new Date(t.createdAt).toLocaleString()}</td><td><strong>{t.itemName}</strong><span>{t.branchName}</span></td><td><span className="role-chip">{t.type}</span></td><td>{Number(t.quantity).toFixed(3)} {t.unit}</td><td>{Number(t.stockAfter).toFixed(3)} {t.unit}</td><td>{t.createdBy}</td></tr>)}
          </tbody></table></div>
        }
      </div>
    </div>
  );
}



function MenuPage({ user }) {
  const [menu, setMenu] = useState([]);
  const [items, setItems] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(user.branchId ? String(user.branchId) : "");
  const [form, setForm] = useState({ name: "", category: "Main Course", price: "", branchId: user.branchId ? String(user.branchId) : "" });
  const [recipe, setRecipe] = useState({ menuId: "", inventoryItemId: "", quantity: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const canManage = ["Organization Admin", "Branch Manager", "Kitchen Manager"].includes(user.role);

  async function load() {
    try {
      const branch = user.branchId ? Number(user.branchId) : (selectedBranch ? Number(selectedBranch) : undefined);
      const [m, i, b] = await Promise.all([api.getMenu(branch), api.getInventoryItems(branch), api.getBranches()]);
      setMenu(m); setItems(i); setBranches(b);
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, [selectedBranch]);

  async function createMenu(e) {
    e.preventDefault(); setError(""); setMessage("");
    try {
      await api.createMenuItem({ branchId: user.branchId ? Number(user.branchId) : Number(form.branchId), name: form.name, category: form.category, price: Number(form.price) });
      setForm({ ...form, name: "", price: "" }); setMessage("Menu item created."); await load();
    } catch (e) { setError(e.message); }
  }
  async function addRecipe(e) {
    e.preventDefault(); setError(""); setMessage("");
    try { await api.addRecipeIngredient(Number(recipe.menuId), { inventoryItemId: Number(recipe.inventoryItemId), quantity: Number(recipe.quantity) }); setMessage("Recipe ingredient saved."); setRecipe({ ...recipe, inventoryItemId: "", quantity: "" }); await load(); }
    catch (e) { setError(e.message); }
  }
  return <div className="page-grid">
    <div className="page-intro"><div><span className="eyebrow">FOOD CATALOG</span><h1>Menu & Recipes</h1><p>Define what waiters can sell and how each order consumes branch inventory.</p></div></div>
    {error && <div className="error-box">{error}</div>}{message && <div className="success-box">{message}</div>}
    {!user.branchId && <div className="branch-filter panel"><div><span className="eyebrow">BRANCH SCOPE</span><strong>Menu branch</strong></div><select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}><option value="">All branches</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>}
    {canManage && <div className="panel form-panel"><div className="panel-head"><div><span className="eyebrow">CREATE</span><h3>Add food</h3></div><Utensils size={20}/></div><form className="form-grid" onSubmit={createMenu}>{!user.branchId && <label className="field"><span>Branch</span><select required value={form.branchId} onChange={e => setForm({...form, branchId:e.target.value})}><option value="">Select branch</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}<Field label="Food name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Chicken Biryani"/><Field label="Category" value={form.category} onChange={e=>setForm({...form,category:e.target.value})} placeholder="Main Course"/><Field label="Price" type="number" min="0" step="0.01" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} placeholder="180"/><div className="form-action"><button className="primary-btn compact">Add food <ChevronRight size={17}/></button></div></form></div>}
    {canManage && menu.length > 0 && <div className="panel form-panel"><div className="panel-head"><div><span className="eyebrow">RECIPE</span><h3>Connect food to inventory</h3></div><Package size={20}/></div><form className="form-grid" onSubmit={addRecipe}><label className="field"><span>Food</span><select required value={recipe.menuId} onChange={e=>setRecipe({...recipe,menuId:e.target.value})}><option value="">Select food</option>{menu.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label className="field"><span>Ingredient</span><select required value={recipe.inventoryItemId} onChange={e=>setRecipe({...recipe,inventoryItemId:e.target.value})}><option value="">Select inventory item</option>{items.map(i=><option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}</select></label><Field label="Quantity per food" type="number" min="0.001" step="0.001" value={recipe.quantity} onChange={e=>setRecipe({...recipe,quantity:e.target.value})} placeholder="0.150"/><div className="form-action"><button className="primary-btn compact">Save ingredient <ChevronRight size={17}/></button></div></form></div>}
    <div className="panel"><div className="panel-head"><div><span className="eyebrow">MENU</span><h3>Available food</h3></div><Utensils size={20}/></div>{menu.length===0?<div className="empty-row">No menu items yet.</div>:<div className="table-wrap"><table><thead><tr><th>Food</th><th>Category</th><th>Price</th><th>Recipe</th></tr></thead><tbody>{menu.map(m=><tr key={m.id}><td><strong>{m.name}</strong></td><td>{m.category}</td><td>₹{Number(m.price).toFixed(2)}</td><td>{m.recipeCount} ingredient{m.recipeCount!==1?'s':''}{m.ingredients?.length>0&&<span>{m.ingredients.map(i=>`${i.inventoryItemName}: ${i.quantity} ${i.unit}`).join(' • ')}</span>}</td></tr>)}</tbody></table></div>}</div>
  </div>;
}

function OrdersPage({ user }) {
  if (user.role === "Waiter") return <WaiterOrderPage user={user}/>;
  return <OrdersMonitor user={user}/>;
}

function WaiterOrderPage({ user }) {
  const [menu, setMenu] = useState([]);
  const [table, setTable] = useState("");
  const [cart, setCart] = useState([]);
  const [ready, setReady] = useState([]);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [lastReadyIds, setLastReadyIds] = useState(() => JSON.parse(localStorage.getItem("samaya_ready_ids") || "[]"));
  async function load() { try { const [m, r, all] = await Promise.all([api.getMenu(user.branchId), api.getReadyOrdersForWaiter(), api.getOrders()]); setMenu(m); setReady(r); setOrders(all.filter(o=>o.status !== "Served" && o.status !== "Cancelled")); } catch(e){ setError(e.message); } }
  useEffect(() => { load(); const timer=setInterval(load,5000); return()=>clearInterval(timer); }, []);
  useEffect(() => { const ids=ready.map(x=>x.id); const newReady=ready.filter(x=>!lastReadyIds.includes(x.id)); if(newReady.length){ setMessage(`Kitchen ready: ${newReady.map(x=>x.orderNumber).join(", ")}`); setLastReadyIds(ids); localStorage.setItem("samaya_ready_ids", JSON.stringify(ids)); } }, [ready]);
  function add(m) { setCart(c=>{ const found=c.find(x=>x.menuItemId===m.id); return found?c.map(x=>x.menuItemId===m.id?{...x,quantity:x.quantity+1}:x):[...c,{menuItemId:m.id,name:m.name,price:m.price,quantity:1}]; }); }
  function remove(id){setCart(c=>c.map(x=>x.menuItemId===id?{...x,quantity:x.quantity-1}:x).filter(x=>x.quantity>0));}
  async function sendOrder(){ setError(""); setMessage(""); if(!cart.length){setError("Select at least one food item.");return;} try{const result=await api.createOrder({branchId:Number(user.branchId),tableNumber:table,items:cart.map(x=>({menuItemId:x.menuItemId,quantity:x.quantity}))}); setCart([]); setTable(""); setMessage(`${result.orderNumber} sent to kitchen.`); await load();}catch(e){setError(e.message);} }
  async function serve(id){try{await api.updateOrderStatus(id,"Served");setMessage("Order served to customer.");await load();}catch(e){setError(e.message);}}
  return <div className="page-grid"><div className="page-intro"><div><span className="eyebrow">WAITER ORDER DESK</span><h1>Take customer order</h1><p>Select the customer's food, send it to kitchen, then serve it when the app says it is ready.</p></div><span className="count-chip">{ready.length} ready</span></div>{error&&<div className="error-box">{error}</div>}{message&&<div className="success-box">🔔 {message}</div>}
    <div className="section-grid"><div className="panel"><div className="panel-head"><div><span className="eyebrow">CUSTOMER</span><h3>Order details</h3></div><ShoppingCart size={20}/></div><div className="form-grid"><Field label="Table / order reference" value={table} onChange={e=>setTable(e.target.value)} placeholder="Table 12"/></div><div className="food-grid">{menu.map(m=><button className="food-card" key={m.id} onClick={()=>add(m)}><strong>{m.name}</strong><span>{m.category}</span><b>₹{Number(m.price).toFixed(2)}</b><small>+ Add</small></button>)}</div></div>
    <div className="panel"><div className="panel-head"><div><span className="eyebrow">CURRENT ORDER</span><h3>{table||"Customer"}</h3></div></div>{cart.length===0?<div className="empty-row">No food selected.</div>:<>{cart.map(x=><div className="operation" key={x.menuItemId}><div><strong>{x.name}</strong><span>₹{Number(x.price).toFixed(2)} × {x.quantity}</span></div><div><button className="secondary-btn compact" onClick={()=>remove(x.menuItemId)}>−</button><button className="secondary-btn compact" onClick={()=>add(x)}>+</button></div></div>)}<button className="primary-btn" onClick={sendOrder}>Send to kitchen <ChevronRight size={17}/></button></>}</div></div>
    <div className="panel"><div className="panel-head"><div><span className="eyebrow">KITCHEN NOTIFICATIONS</span><h3>Ready to serve</h3></div><Utensils size={20}/></div>{ready.length===0?<div className="empty-row">No completed food waiting for service.</div>:ready.map(o=><div className="operation" key={o.id}><div><strong>{o.orderNumber} · {o.tableNumber||"No table"}</strong><span>{o.items.map(i=>`${i.menuItemName} × ${i.quantity}`).join(", ")}</span></div><button className="primary-btn compact" onClick={()=>serve(o.id)}>Serve <ChevronRight size={16}/></button></div>)}</div>
    <div className="panel"><div className="panel-head"><div><span className="eyebrow">OPEN ORDERS</span><h3>Order status</h3></div></div>{orders.length===0?<div className="empty-row">No open orders.</div>:<div className="table-wrap"><table><thead><tr><th>Order</th><th>Table</th><th>Items</th><th>Status</th><th>Total</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td><strong>{o.orderNumber}</strong><span>{new Date(o.createdAt).toLocaleTimeString()}</span></td><td>{o.tableNumber||"—"}</td><td>{o.items.map(i=>`${i.menuItemName} × ${i.quantity}`).join(", ")}</td><td><span className={`status ${o.status==="Ready"?"active":"inactive"}`}>{o.status}</span></td><td>₹{Number(o.totalAmount).toFixed(2)}</td></tr>)}</tbody></table></div>}</div>
  </div>;
}

function KitchenPage() {
  const [orders,setOrders]=useState([]); const [error,setError]=useState(""); const [message,setMessage]=useState("");
  async function load(){try{setOrders(await api.getOrders());}catch(e){setError(e.message);}}
  useEffect(()=>{load();const t=setInterval(load,3000);return()=>clearInterval(t);},[]);
  async function status(id,s){try{await api.updateOrderStatus(id,s);setMessage(`Order marked ${s}.`);await load();}catch(e){setError(e.message);}}
  const active=orders.filter(o=>["Pending","Preparing"].includes(o.status));
  return <div className="page-grid"><div className="page-intro"><div><span className="eyebrow">KITCHEN DISPLAY SYSTEM</span><h1>Kitchen queue</h1><p>Incoming waiter orders appear here automatically. Mark preparing, then ready.</p></div><span className="count-chip">{active.length} active</span></div>{error&&<div className="error-box">{error}</div>}{message&&<div className="success-box">{message}</div>}<div className="kitchen-grid">{active.length===0?<div className="panel empty-row">No active kitchen orders.</div>:active.map(o=><div className="panel kitchen-card" key={o.id}><div className="kitchen-card-head"><div><span className="eyebrow">{o.orderNumber}</span><h3>{o.tableNumber||"No table"}</h3></div><span className={`status ${o.status==="Preparing"?"active":"inactive"}`}>{o.status}</span></div><div className="order-lines">{o.items.map(i=><div className="order-line" key={i.id}><strong>{i.menuItemName}</strong><b>× {i.quantity}</b></div>)}</div><div className="kitchen-actions">{o.status==="Pending"&&<button className="secondary-btn" onClick={()=>status(o.id,"Preparing")}>Start preparing</button>}<button className="primary-btn compact" onClick={()=>status(o.id,"Ready")}>Food ready</button></div></div>)}</div></div>;
}

function OrdersMonitor({ user }) {
  const [orders,setOrders]=useState([]); const [error,setError]=useState("");
  async function load(){try{setOrders(await api.getOrders());}catch(e){setError(e.message);}}
  useEffect(()=>{load();const t=setInterval(load,5000);return()=>clearInterval(t);},[]);
  return <div className="page-grid"><div className="page-intro"><div><span className="eyebrow">ORDER CONTROL</span><h1>Orders</h1><p>Branch order status and service flow.</p></div></div>{error&&<div className="error-box">{error}</div>}<div className="panel"><div className="panel-head"><div><span className="eyebrow">LIVE</span><h3>Orders</h3></div><RefreshCw size={20}/></div><div className="table-wrap"><table><thead><tr><th>Order</th><th>Waiter</th><th>Table</th><th>Items</th><th>Status</th><th>Total</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td><strong>{o.orderNumber}</strong><span>{new Date(o.createdAt).toLocaleString()}</span></td><td>{o.waiterName}</td><td>{o.tableNumber||"—"}</td><td>{o.items.map(i=>`${i.menuItemName} × ${i.quantity}`).join(", ")}</td><td><span className={`status ${o.status==="Ready"||o.status==="Served"?"active":"inactive"}`}>{o.status}</span></td><td>₹{Number(o.totalAmount).toFixed(2)}</td></tr>)}</tbody></table></div></div></div>;
}
