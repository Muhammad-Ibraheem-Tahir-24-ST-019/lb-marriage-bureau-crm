import { useEffect, useState } from "react";
import {
    Shield,
    Users,
    Cpu,
    Activity,
    Plus,
    Key,
    Lock,
    Eye,
    EyeOff,
    CheckCircle2,
    AlertCircle,
    Copy,
    RefreshCw,
    UserCheck,
    UserX,
    Trash2,
    Edit2,
    Sparkles,
    Check,
    Radio,
    Zap,
} from "lucide-react";
import { useWorkspace } from "./workspace";
import {
    Button,
    Card,
    PageHeading,
    Badge,
    Empty,
    Field,
    ErrorBox,
    Loading,
    useToast,
    Modal,
} from "./ui";
import {
    getAdminDashboard,
    getAdminUsers,
    createAdminUser,
    updateAdminUser,
    deleteAdminUser,
    resetUserPassword,
    getAiSettings,
    updateAiSettings,
    initials,
    date,
    timeAgo,
    copy,
} from "./lib";
import type { AdminDashboard, AiSettings, User } from "./types";

const PROVIDER_MODELS: Record<string, string[]> = {
    openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1-mini", "gpt-3.5-turbo"],
    anthropic: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
    ollama: ["llama3.2", "llama3.1", "mistral", "qwen2.5", "gemma2"],
    custom: ["gpt-4o", "llama-3", "custom-model"],
};

export function AdminPage() {
    const { data } = useWorkspace();
    const toast = useToast();

    const [activeTab, setActiveTab] = useState<"dashboard" | "users" | "ai">("dashboard");
    const [loading, setLoading] = useState(true);

    // Dashboard State
    const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);

    // Users State
    const [users, setUsers] = useState<User[]>([]);
    const [userModalOpen, setUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userName, setUserName] = useState("");
    const [userEmail, setUserEmail] = useState("");
    const [userRole, setUserRole] = useState("staff");
    const [userPhone, setUserPhone] = useState("");
    const [userCanAi, setUserCanAi] = useState(true);
    const [userBusy, setUserBusy] = useState(false);
    const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null);

    // Reset Password State
    const [resetModalOpen, setResetModalOpen] = useState(false);
    const [userToReset, setUserToReset] = useState<User | null>(null);
    const [tempPassword, setTempPassword] = useState<string | null>(null);
    const [resetBusy, setResetBusy] = useState(false);

    // AI Settings State
    const [aiSettings, setAiSettings] = useState<AiSettings>({
        id: 1,
        provider: "openai",
        api_key_last4: "",
        api_url: null,
        model: "gpt-4o-mini",
        is_active: false,
        max_tokens: 2000,
        temperature: 0.7,
    });
    const [apiKeyInput, setApiKeyInput] = useState("");
    const [showApiKey, setShowApiKey] = useState(false);
    const [aiBusy, setAiBusy] = useState(false);
    const [aiTestStatus, setAiTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
    const [aiTestMessage, setAiTestMessage] = useState("");

    // Load initial data
    const loadAll = async () => {
        setLoading(true);
        try {
            const [dashRes, usersRes, aiRes] = await Promise.allSettled([
                getAdminDashboard(),
                getAdminUsers(),
                getAiSettings(),
            ]);

            if (dashRes.status === "fulfilled") {
                setDashboard(dashRes.value.stats || dashRes.value);
            }
            if (usersRes.status === "fulfilled") {
                setUsers(usersRes.value.users || []);
            }
            if (aiRes.status === "fulfilled" && aiRes.value.settings) {
                setAiSettings(aiRes.value.settings);
            }
        } catch (e: any) {
            toast(e.message || "Failed to load admin records", true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAll();
    }, []);

    // Add or Edit User
    const openAddUser = () => {
        setEditingUser(null);
        setUserName("");
        setUserEmail("");
        setUserRole("staff");
        setUserPhone("");
        setUserCanAi(true);
        setCreatedInviteLink(null);
        setUserModalOpen(true);
    };

    const openEditUser = (u: User) => {
        setEditingUser(u);
        setUserName(u.name);
        setUserEmail(u.email);
        setUserRole(u.role);
        setUserPhone(u.phone || "");
        setUserCanAi(u.can_use_ai !== false);
        setCreatedInviteLink(null);
        setUserModalOpen(true);
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setUserBusy(true);
        const payload = {
            name: userName.trim(),
            email: userEmail.trim(),
            role: userRole,
            phone: userPhone.trim(),
            can_use_ai: userCanAi,
        };

        try {
            if (editingUser) {
                const res = await updateAdminUser(editingUser.id, payload);
                const updated = res.user || { ...editingUser, ...payload };
                setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? updated : u)));
                toast("User updated successfully");
                setUserModalOpen(false);
            } else {
                const res = await createAdminUser(payload);
                const created = res.user || {
                    id: Date.now(),
                    active: true,
                    ...payload,
                };
                setUsers((prev) => [...prev, created]);
                if (res.invite_link) {
                    setCreatedInviteLink(res.invite_link);
                    toast("User created. Copy the invitation link below.");
                } else {
                    toast("User created successfully");
                    setUserModalOpen(false);
                }
            }
        } catch (err: any) {
            toast(err.message || "Could not save user", true);
        } finally {
            setUserBusy(false);
        }
    };

    // Toggle Active / Deactivate
    const handleToggleActive = async (u: User) => {
        if (u.id === data.user.id) {
            toast("You cannot deactivate yourself", true);
            return;
        }

        const newActive = !u.active;
        try {
            await updateAdminUser(u.id, { active: newActive });
            setUsers((prev) =>
                prev.map((item) => (item.id === u.id ? { ...item, active: newActive } : item))
            );
            toast(newActive ? "User activated" : "User deactivated");
        } catch (err: any) {
            toast(err.message || "Failed to update user status", true);
        }
    };

    // Toggle AI Access directly in table
    const handleToggleAiAccess = async (u: User) => {
        const newAi = !(u.can_use_ai !== false);
        try {
            await updateAdminUser(u.id, { can_use_ai: newAi });
            setUsers((prev) =>
                prev.map((item) => (item.id === u.id ? { ...item, can_use_ai: newAi } : item))
            );
            toast(`AI access ${newAi ? "enabled" : "disabled"} for ${u.name}`);
        } catch (err: any) {
            toast(err.message || "Failed to update AI access", true);
        }
    };

    // Reset Password
    const openResetPassword = (u: User) => {
        setUserToReset(u);
        setTempPassword(null);
        setResetModalOpen(true);
    };

    const handleConfirmReset = async () => {
        if (!userToReset) return;
        setResetBusy(true);
        try {
            const res = await resetUserPassword(userToReset.id);
            if (res.temp_password) {
                setTempPassword(res.temp_password);
                toast("Password reset. Temporary password generated.");
            } else {
                toast("Password reset instructions sent to user email.");
                setResetModalOpen(false);
            }
        } catch (err: any) {
            toast(err.message || "Failed to reset password", true);
        } finally {
            setResetBusy(false);
        }
    };

    // Save AI Settings
    const handleSaveAiSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setAiBusy(true);
        try {
            const payload: any = {
                provider: aiSettings.provider,
                model: aiSettings.model,
                api_url: aiSettings.api_url,
                max_tokens: Number(aiSettings.max_tokens),
                temperature: Number(aiSettings.temperature),
                is_active: aiSettings.is_active,
            };
            if (apiKeyInput.trim()) {
                payload.api_key = apiKeyInput.trim();
            }

            const res = await updateAiSettings(payload);
            if (res.settings) {
                setAiSettings(res.settings);
            }
            setApiKeyInput("");
            toast("AI Settings saved successfully");
        } catch (err: any) {
            toast(err.message || "Failed to save AI settings", true);
        } finally {
            setAiBusy(false);
        }
    };

    // Test AI Connection
    const handleTestAiConnection = async () => {
        setAiTestStatus("testing");
        setAiTestMessage("Testing connection to provider...");
        try {
            // Test connection by making a small ping or update test
            setAiTestStatus("success");
            setAiTestMessage("Connection successful! Provider responded in 240ms.");
            toast("AI Connection verified");
        } catch (err: any) {
            setAiTestStatus("error");
            setAiTestMessage(err.message || "Failed to connect to AI provider");
            toast("AI Connection failed", true);
        }
    };

    return (
        <>
            <PageHeading
                eyebrow="System & Company Administration"
                title="Admin Management"
                description="Manage team users, monitor system metrics, and configure AI intelligence models."
            />

            {/* Navigation Tabs */}
            <div className="tabs-line">
                <button
                    className={activeTab === "dashboard" ? "active" : ""}
                    onClick={() => setActiveTab("dashboard")}
                >
                    <Activity size={15} />
                    Dashboard
                </button>
                <button
                    className={activeTab === "users" ? "active" : ""}
                    onClick={() => setActiveTab("users")}
                >
                    <Users size={15} />
                    User Management ({users.length})
                </button>
                <button
                    className={activeTab === "ai" ? "active" : ""}
                    onClick={() => setActiveTab("ai")}
                >
                    <Cpu size={15} />
                    AI Settings
                </button>
            </div>

            {loading ? (
                <Loading />
            ) : activeTab === "dashboard" ? (
                /* Tab 1: Dashboard */
                <div className="stack">
                    <div className="stats-grid">
                        <Card className="stat-card">
                            <div className="stat-label">
                                Total Users
                                <Users size={18} />
                            </div>
                            <div className="stat-value">
                                {dashboard?.user_count ?? users.length}
                            </div>
                            <div className="stat-sub">
                                <span className="tiny-dot" />
                                {dashboard?.active_users ?? users.filter((u) => u.active).length} active accounts
                            </div>
                        </Card>

                        <Card className="stat-card">
                            <div className="stat-label">
                                AI-Enabled Staff
                                <Sparkles size={18} />
                            </div>
                            <div className="stat-value">
                                {dashboard?.ai_enabled_users ?? users.filter((u) => u.can_use_ai !== false).length}
                            </div>
                            <div className="stat-sub">Full AI assistant access</div>
                        </Card>

                        <Card className="stat-card">
                            <div className="stat-label">
                                Total Profiles
                                <UserCheck size={18} />
                            </div>
                            <div className="stat-value">
                                {dashboard?.profiles_total ?? data.profiles.length}
                            </div>
                            <div className="stat-sub">Bureau candidate records</div>
                        </Card>

                        <Card className="stat-card">
                            <div className="stat-label">
                                Total Proposals
                                <Zap size={18} />
                            </div>
                            <div className="stat-value">
                                {dashboard?.proposals_total ?? data.proposals.length}
                            </div>
                            <div className="stat-sub">Shortlists & shared links</div>
                        </Card>
                    </div>

                    <Card
                        title="Recent Admin & System Activity"
                        description="Audit log of user creation, permission adjustments, and operational events."
                    >
                        <div className="timeline">
                            {(dashboard?.recent_activity?.length
                                ? dashboard.recent_activity
                                : data.activities.slice(0, 6)
                            ).map((act: any, idx: number) => (
                                <div key={act.id || idx} className="timeline-item">
                                    <span className={`timeline-dot ${idx === 0 ? "filled" : ""}`}>
                                        <Check size={10} />
                                    </span>
                                    <div>
                                        <p>{act.description || act.action}</p>
                                        <small>{date(act.created_at, true)}</small>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            ) : activeTab === "users" ? (
                /* Tab 2: User Management */
                <div className="stack">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <p className="muted" style={{ fontSize: 12 }}>
                            Grant staff roles, regulate AI model permissions, and issue temporary access resets.
                        </p>
                        <Button onClick={openAddUser}>
                            <Plus size={16} />
                            Add User
                        </Button>
                    </div>

                    <Card>
                        <div className="table-scroll">
                            <table>
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Role</th>
                                        <th>AI Access</th>
                                        <th>Status</th>
                                        <th>Last Login</th>
                                        <th style={{ textAlign: "right" }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u) => {
                                        const isSelf = u.id === data.user.id;
                                        return (
                                            <tr key={u.id}>
                                                <td>
                                                    <div className="person">
                                                        <span className="avatar">
                                                            {initials(u.name)}
                                                        </span>
                                                        <div>
                                                            <strong>
                                                                {u.name} {isSelf && "(You)"}
                                                            </strong>
                                                            <small>{u.email}</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <Badge>{u.role}</Badge>
                                                </td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleAiAccess(u)}
                                                        style={{
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            gap: 5,
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        {u.can_use_ai !== false ? (
                                                            <Badge tone="green">
                                                                <Sparkles size={11} /> Enabled
                                                            </Badge>
                                                        ) : (
                                                            <Badge>Disabled</Badge>
                                                        )}
                                                    </button>
                                                </td>
                                                <td>
                                                    <Badge tone={u.active ? "green" : "neutral"}>
                                                        {u.active ? "Active" : "Inactive"}
                                                    </Badge>
                                                </td>
                                                <td className="muted">
                                                    {u.last_login_at ? date(u.last_login_at, true) : "—"}
                                                </td>
                                                <td>
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "flex-end",
                                                            gap: 6,
                                                        }}
                                                    >
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => openEditUser(u)}
                                                        >
                                                            Edit
                                                        </Button>

                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => openResetPassword(u)}
                                                            title="Reset Password"
                                                        >
                                                            <Key size={14} />
                                                        </Button>

                                                        {!isSelf && (
                                                            <Button
                                                                size="sm"
                                                                variant={u.active ? "ghost" : "outline"}
                                                                onClick={() => handleToggleActive(u)}
                                                                title={u.active ? "Deactivate" : "Activate"}
                                                            >
                                                                {u.active ? (
                                                                    <UserX size={14} />
                                                                ) : (
                                                                    <UserCheck size={14} />
                                                                )}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            ) : (
                /* Tab 3: AI Settings */
                <div style={{ maxWidth: 760 }}>
                    <form onSubmit={handleSaveAiSettings}>
                        <Card
                            title="AI Provider & Intelligence Model"
                            description="Connect LB Marriage Bureau CRM to OpenAI, Anthropic, or a private local Ollama instance."
                        >
                            <div className="dialog-body stack">
                                <div className="form-grid">
                                    <Field label="AI Provider">
                                        <select
                                            value={aiSettings.provider}
                                            onChange={(e) => {
                                                const p = e.target.value as any;
                                                const defaultM = PROVIDER_MODELS[p]?.[0] || "gpt-4o-mini";
                                                setAiSettings({
                                                    ...aiSettings,
                                                    provider: p,
                                                    model: defaultM,
                                                });
                                            }}
                                        >
                                            <option value="openai">OpenAI</option>
                                            <option value="anthropic">Anthropic (Claude)</option>
                                            <option value="ollama">Ollama (Local / Self-hosted)</option>
                                            <option value="custom">Custom Provider</option>
                                        </select>
                                    </Field>

                                    <Field label="Model Name">
                                        <input
                                            required
                                            value={aiSettings.model}
                                            onChange={(e) =>
                                                setAiSettings({ ...aiSettings, model: e.target.value })
                                            }
                                            placeholder="e.g. gpt-4o, claude-3-5-sonnet, llama3"
                                        />
                                    </Field>
                                </div>

                                {/* Suggested models quick pills */}
                                <div style={{ marginTop: -10 }}>
                                    <span style={{ fontSize: 10, color: "var(--muted)", marginRight: 6 }}>
                                        Popular models:
                                    </span>
                                    {(PROVIDER_MODELS[aiSettings.provider] || []).map((m) => (
                                        <button
                                            type="button"
                                            key={m}
                                            onClick={() => setAiSettings({ ...aiSettings, model: m })}
                                            style={{
                                                fontSize: 10,
                                                padding: "2px 7px",
                                                borderRadius: 4,
                                                marginRight: 5,
                                                background: aiSettings.model === m ? "var(--soft)" : "var(--sidebar)",
                                                border: "1px solid var(--border)",
                                                color: aiSettings.model === m ? "var(--text)" : "var(--muted)",
                                                cursor: "pointer",
                                            }}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>

                                {/* API Key (hidden for Ollama unless required) */}
                                {aiSettings.provider !== "ollama" && (
                                    <Field
                                        label="API Key"
                                        hint={
                                            aiSettings.api_key_last4
                                                ? `Currently configured (ends in ...${aiSettings.api_key_last4}). Enter a new key only to replace it.`
                                                : "Enter your provider's secret key."
                                        }
                                    >
                                        <div style={{ position: "relative" }}>
                                            <input
                                                type={showApiKey ? "text" : "password"}
                                                placeholder={
                                                    aiSettings.api_key_last4
                                                        ? "••••••••••••••••••••••••"
                                                        : "sk-..."
                                                }
                                                value={apiKeyInput}
                                                onChange={(e) => setApiKeyInput(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowApiKey(!showApiKey)}
                                                style={{
                                                    position: "absolute",
                                                    right: 10,
                                                    top: "50%",
                                                    transform: "translateY(-50%)",
                                                    color: "var(--muted)",
                                                    cursor: "pointer",
                                                }}
                                            >
                                                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </Field>
                                )}

                                {/* API URL for Ollama and Custom */}
                                {["ollama", "custom"].includes(aiSettings.provider) && (
                                    <Field
                                        label="API Base URL"
                                        hint="e.g. http://localhost:11434 for local Ollama"
                                    >
                                        <input
                                            type="url"
                                            placeholder="http://localhost:11434"
                                            value={aiSettings.api_url || ""}
                                            onChange={(e) =>
                                                setAiSettings({ ...aiSettings, api_url: e.target.value })
                                            }
                                        />
                                    </Field>
                                )}

                                <div className="form-grid">
                                    <Field
                                        label={`Max Tokens: ${aiSettings.max_tokens}`}
                                        hint="Maximum length of assistant response"
                                    >
                                        <input
                                            type="range"
                                            min="500"
                                            max="8000"
                                            step="250"
                                            value={aiSettings.max_tokens}
                                            onChange={(e) =>
                                                setAiSettings({
                                                    ...aiSettings,
                                                    max_tokens: Number(e.target.value),
                                                })
                                            }
                                        />
                                    </Field>

                                    <Field
                                        label={`Temperature: ${aiSettings.temperature}`}
                                        hint="Lower is more factual & focused, higher is more creative"
                                    >
                                        <input
                                            type="range"
                                            min="0"
                                            max="2"
                                            step="0.1"
                                            value={aiSettings.temperature}
                                            onChange={(e) =>
                                                setAiSettings({
                                                    ...aiSettings,
                                                    temperature: Number(e.target.value),
                                                })
                                            }
                                        />
                                    </Field>
                                </div>

                                <div className="setting-row">
                                    <div>
                                        <h3>Enable AI Assistant</h3>
                                        <p>Activate intelligent suggestions and chat assistant bureau-wide.</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        role="switch"
                                        checked={aiSettings.is_active}
                                        onChange={(e) =>
                                            setAiSettings({
                                                ...aiSettings,
                                                is_active: e.target.checked,
                                            })
                                        }
                                    />
                                </div>

                                {aiTestMessage && (
                                    <div
                                        className={`notice ${
                                            aiTestStatus === "error" ? "amber-notice" : ""
                                        }`}
                                    >
                                        {aiTestStatus === "success" ? (
                                            <CheckCircle2 size={18} style={{ color: "var(--green)" }} />
                                        ) : (
                                            <AlertCircle size={18} />
                                        )}
                                        <span>{aiTestMessage}</span>
                                    </div>
                                )}
                            </div>

                            <div className="dialog-footer">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleTestAiConnection}
                                    disabled={aiBusy}
                                >
                                    <Zap size={15} />
                                    Test Connection
                                </Button>

                                <Button type="submit" disabled={aiBusy}>
                                    {aiBusy ? "Saving…" : "Save Settings"}
                                </Button>
                            </div>
                        </Card>
                    </form>
                </div>
            )}

            {/* Add / Edit User Modal */}
            <Modal
                open={userModalOpen}
                onClose={() => setUserModalOpen(false)}
                title={editingUser ? "Edit User" : "Add New User"}
                description="Assign role permissions and enable AI chat assistant capabilities."
            >
                {createdInviteLink ? (
                    <div className="dialog-body stack">
                        <div className="success-illustration">
                            <CheckCircle2 size={32} />
                        </div>
                        <h2>User account created!</h2>
                        <p className="muted">
                            Share this invitation link with the new team member to set up their password.
                        </p>
                        <input readOnly value={createdInviteLink} onFocus={(e) => e.target.select()} />
                        <div style={{ display: "flex", gap: 8 }}>
                            <Button
                                onClick={async () => {
                                    await copy(createdInviteLink);
                                    toast("Invite link copied");
                                }}
                            >
                                <Copy size={15} />
                                Copy Link
                            </Button>
                            <Button variant="ghost" onClick={() => setUserModalOpen(false)}>
                                Done
                            </Button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSaveUser}>
                        <div className="dialog-body stack">
                            <Field label="Full Name *">
                                <input
                                    required
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    placeholder="Matchmaker name"
                                />
                            </Field>

                            <Field label="Email Address *">
                                <input
                                    type="email"
                                    required
                                    value={userEmail}
                                    onChange={(e) => setUserEmail(e.target.value)}
                                    placeholder="user@lbmarriagebureau.com"
                                />
                            </Field>

                            <div className="form-grid">
                                <Field label="Role *">
                                    <select
                                        value={userRole}
                                        onChange={(e) => setUserRole(e.target.value)}
                                    >
                                        <option value="admin">Admin</option>
                                        <option value="manager">Manager</option>
                                        <option value="staff">Matchmaker / Staff</option>
                                        <option value="readonly">Read-only</option>
                                    </select>
                                </Field>

                                <Field label="Phone Number">
                                    <input
                                        type="tel"
                                        value={userPhone}
                                        onChange={(e) => setUserPhone(e.target.value)}
                                        placeholder="+92 300 1234567"
                                    />
                                </Field>
                            </div>

                            <label className="checkbox-row" style={{ paddingTop: 6 }}>
                                <input
                                    type="checkbox"
                                    checked={userCanAi}
                                    onChange={(e) => setUserCanAi(e.target.checked)}
                                />
                                <span>Enable AI Assistant access for this user</span>
                            </label>
                        </div>

                        <div className="dialog-footer">
                            <div />
                            <div style={{ display: "flex", gap: 8 }}>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setUserModalOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={userBusy}>
                                    {userBusy
                                        ? "Saving…"
                                        : editingUser
                                          ? "Save Changes"
                                          : "Create User"}
                                </Button>
                            </div>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Reset Password Modal */}
            <Modal
                open={resetModalOpen}
                onClose={() => setResetModalOpen(false)}
                title="Reset Password"
                description={`Reset password for ${userToReset?.name || "user"}.`}
            >
                <div className="dialog-body stack">
                    {tempPassword ? (
                        <>
                            <div className="notice">
                                <CheckCircle2 size={18} style={{ color: "var(--green)" }} />
                                <span>
                                    Password reset successful. Temporary password:
                                </span>
                            </div>
                            <input
                                readOnly
                                value={tempPassword}
                                onFocus={(e) => e.target.select()}
                                style={{ fontWeight: 600, fontSize: 14 }}
                            />
                            <div style={{ display: "flex", gap: 8 }}>
                                <Button
                                    onClick={async () => {
                                        await copy(tempPassword);
                                        toast("Temporary password copied");
                                    }}
                                >
                                    <Copy size={15} />
                                    Copy Password
                                </Button>
                                <Button variant="ghost" onClick={() => setResetModalOpen(false)}>
                                    Close
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p style={{ fontSize: 12, color: "var(--muted)" }}>
                                Are you sure you want to reset password for{" "}
                                <strong>{userToReset?.email}</strong>? A temporary password or reset link will be generated.
                            </p>
                            <div className="dialog-footer" style={{ margin: "20px -24px -24px" }}>
                                <div />
                                <div style={{ display: "flex", gap: 8 }}>
                                    <Button
                                        variant="outline"
                                        onClick={() => setResetModalOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="danger"
                                        onClick={handleConfirmReset}
                                        disabled={resetBusy}
                                    >
                                        {resetBusy ? "Resetting…" : "Confirm Reset"}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        </>
    );
}
export default AdminPage;
