import { createContext, useContext, useEffect, useState } from "react";
import {
    LayoutDashboard,
    Users,
    HeartHandshake,
    Send,
    CalendarClock,
    CalendarDays,
    ChartNoAxesCombined,
    Settings,
    Search,
    Bell,
    ChevronDown,
    PanelLeftClose,
    Menu,
    LogOut,
    Sun,
    Moon,
    Monitor,
    Plus,
    ArrowUpRight,
    ShieldCheck,
    Command,
    X,
    Building2,
    LifeBuoy,
    Bot,
    StickyNote,
    MessageSquare,
    Shield,
} from "lucide-react";
import type { State, AppNotification } from "./types";
import {
    api,
    initials,
    isDone,
    date,
    timeAgo,
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
} from "./lib";
import { Button, Loading, ErrorBox, Modal, useToast, Empty } from "./ui";
import { Dashboard, Reports } from "./dashboard";
import { Profiles, ProfileDetail, ProfileEditor, Matching } from "./profiles";
import {
    Proposals,
    ProposalForm,
    ShareForm,
    WorkPage,
    WorkForm,
} from "./workflow";
import { SettingsPage, StaffPage } from "./settings";
import { AiChatPage } from "./ai-chat";
import { NotesPage } from "./notes";
import { TeamPage } from "./team";
import { AdminPage } from "./admin";
type Context = {
    data: State;
    refresh: () => Promise<void>;
    go: (path: string) => void;
    canWrite: boolean;
    owner: boolean;
    open: (type: string, value?: any) => void;
};
const Context = createContext<Context>(null!);
export const useWorkspace = () => useContext(Context);
export default function Workspace({ demo }: { demo: boolean }) {
    const [data, setData] = useState<State | null>(null),
        [error, setError] = useState(""),
        [path, setPath] = useState(location.pathname.replace(/^\/app\/?/, "")),
        [mobile, setMobile] = useState(false),
        [modal, setModal] = useState<{ type: string; value?: any } | null>(
            null,
        ),
        [search, setSearch] = useState(""),
        [theme, setTheme] = useState(
            localStorage.getItem("lb-theme") || "light",
        ),
        [notifications, setNotifications] = useState<AppNotification[]>([]),
        [notifOpen, setNotifOpen] = useState(false);
    const toast = useToast();
    const refresh = async () => {
        setData(await api<State>("/state"));
    };
    const loadNotifs = async () => {
        try {
            const res = await getNotifications();
            setNotifications(res.notifications || []);
        } catch {}
    };
    useEffect(() => {
        refresh().catch((e) => setError(e.message));
        loadNotifs();
        const pop = () => setPath(location.pathname.replace(/^\/app\/?/, ""));
        addEventListener("popstate", pop);
        return () => removeEventListener("popstate", pop);
    }, []);
    useEffect(() => {
        const media = matchMedia("(prefers-color-scheme: dark)");
        const apply = () =>
            document.documentElement.classList.toggle(
                "dark",
                theme === "dark" || (theme === "system" && media.matches),
            );
        apply();
        localStorage.setItem("lb-theme", theme);
        media.addEventListener("change", apply);
        return () => media.removeEventListener("change", apply);
    }, [theme]);
    useEffect(() => {
        const keyboard = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setModal({ type: "search" });
            }
        };
        addEventListener("keydown", keyboard);
        return () => removeEventListener("keydown", keyboard);
    }, []);
    useEffect(() => {
        const focus = () => refresh().catch(() => {});
        addEventListener("focus", focus);
        return () => removeEventListener("focus", focus);
    }, []);
    const go = (p: string) => {
        history.pushState({}, "", `/app${p ? "/" + p : ""}`);
        setPath(p.split("?")[0]);
        setMobile(false);
        setModal(null);
        window.scrollTo(0, 0);
    };
    if (error)
        return (
            <div className="fatal">
                <ErrorBox message={error} />
                <Button onClick={() => location.assign("/login")}>
                    Sign in again
                </Button>
            </div>
        );
    if (!data) return <Loading />;
    document.documentElement.style.setProperty(
        "--accent",
        data.bureau.settings.accent || "#0F766E",
    );
    const canWrite = ["owner", "manager", "staff"].includes(data.user.role),
        owner = data.user.role === "owner";
    const open = (type: string, value?: any) => setModal({ type, value });
    const base = path.split("/")[0],
        count = data.work.filter(
            (w) => w.kind === "followup" && !isDone(w.status),
        ).length;
    const navGroups: [string, [string, any, string][]][] = [
        [
            "Workspace",
            [
                ["Overview", LayoutDashboard, ""],
                ["Profiles", Users, "profiles"],
                ["Smart matching", HeartHandshake, "matching"],
                ["Proposals", Send, "proposals"],
                ["Follow-ups", CalendarClock, "followups"],
                ["Meetings", CalendarDays, "meetings"],
                ["Notes", StickyNote, "notes"],
                ["Team", MessageSquare, "team"],
                ...(data.user.can_use_ai !== false
                    ? [["AI Assistant", Bot, "ai"] as [string, any, string]]
                    : []),
            ],
        ],
        [
            "Organization",
            [
                ["Reports", ChartNoAxesCombined, "reports"],
                ["Staff & roles", Users, "staff"],
                ...(["admin", "superadmin", "owner"].includes(data.user.role)
                    ? [["Admin", Shield, "admin"] as [string, any, string]]
                    : []),
                ["Settings", Settings, "settings"],
            ],
        ],
    ];
    const activeName =
        navGroups.flatMap((g) => g[1]).find((i) => i[2] === base)?.[0] ||
        (base === "ai"
            ? "AI Assistant"
            : base === "notes"
              ? "Notes"
              : base === "team"
                ? "Team"
                : base === "admin"
                  ? "Admin"
                  : "Profile details");
    const close = () => setModal(null);
    const logout = async () => {
        try {
            await api("/logout", "POST");
            location.assign("/login");
        } catch (e: any) {
            toast(e.message, true);
        }
    };
    return (
        <Context.Provider value={{ data, refresh, go, canWrite, owner, open }}>
            <div className="app-shell">
                {mobile && (
                    <button
                        className="sidebar-backdrop"
                        aria-label="Close navigation"
                        onClick={() => setMobile(false)}
                    />
                )}
                <aside className={"sidebar " + (mobile ? "sidebar-open" : "")}>
                    <a
                        className="brand"
                        href="/app"
                        onClick={(e) => {
                            e.preventDefault();
                            go("");
                        }}
                    >
                        <span className="brand-symbol">
                            LB
                        </span>
                        <span>
                            LB Marriage Bureau<span className="brand-dot">.</span>
                        </span>
                        <PanelLeftClose className="brand-collapse" size={16} />
                    </a>
                    <button
                        className="bureau-switch"
                        onClick={() => go("settings")}
                    >
                        <span className="bureau-icon">
                            <Building2 size={18} />
                        </span>
                        <span>
                            <strong>{data.bureau.name}</strong>
                            <small>Marriage bureau workspace</small>
                        </span>
                        <ChevronDown size={14} />
                    </button>
                    <nav aria-label="Main navigation">
                        {navGroups.map(([label, items]) => (
                            <div className="nav-group" key={label}>
                                <div className="nav-label">{label}</div>
                                {items.map(([text, Icon, url]) => (
                                    <button
                                        key={url}
                                        className={
                                            "nav-item " +
                                            (base === url ? "active" : "")
                                        }
                                        onClick={() => go(url)}
                                    >
                                        <Icon size={18} />
                                        <span>{text}</span>
                                        {url === "followups" && count > 0 && (
                                            <span className="nav-count">
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </nav>
                    <div className="sidebar-bottom">
                        <div className="privacy-note">
                            <ShieldCheck size={18} />
                            <div>
                                <strong>Private by design</strong>
                                <p>Your profiles. Your control.</p>
                            </div>
                        </div>
                        <button
                            className="nav-item"
                            onClick={() => open("help")}
                        >
                            <LifeBuoy size={18} />
                            <span>Help & getting started</span>
                            <ArrowUpRight size={14} />
                        </button>
                        <button
                            className="user-block"
                            onClick={() => open("account")}
                        >
                            <span className="avatar">
                                {initials(data.user.name)}
                            </span>
                            <span>
                                <strong>{data.user.name}</strong>
                                <small>
                                    {data.user.role === "owner"
                                        ? "Bureau owner"
                                        : data.user.role}
                                </small>
                            </span>
                            <ChevronDown size={15} />
                        </button>
                    </div>
                </aside>
                <div className="workspace">
                    <header className="topbar">
                        <div className="breadcrumb">
                            <Button
                                className="mobile-toggle"
                                size="icon"
                                variant="ghost"
                                aria-label="Open navigation"
                                onClick={() => setMobile(true)}
                            >
                                <Menu size={20} />
                            </Button>
                            <span>Workspace</span>
                            <span className="slash">/</span>
                            <strong>{activeName}</strong>
                        </div>
                        <div className="topbar-actions">
                            <button
                                className="global-search"
                                onClick={() => open("search")}
                            >
                                <Search size={16} />
                                <span>Search anything…</span>
                                <kbd>⌘ K</kbd>
                            </button>
                            <div
                                className="theme-switch"
                                aria-label="Color theme"
                            >
                                {[
                                    ["light", Sun],
                                    ["dark", Moon],
                                    ["system", Monitor],
                                ].map(([value, Icon]: any) => (
                                    <button
                                        key={value}
                                        title={`${value} theme`}
                                        aria-label={`${value} theme`}
                                        aria-pressed={theme === value}
                                        className={
                                            theme === value ? "selected" : ""
                                        }
                                        onClick={() => setTheme(value)}
                                    >
                                        <Icon size={15} />
                                    </button>
                                ))}
                            </div>
                            <div style={{ position: "relative" }}>
                                <button
                                    className="notification-button"
                                    aria-label="Notifications"
                                    onClick={() => setNotifOpen(!notifOpen)}
                                >
                                    <Bell size={19} />
                                    {(notifications.filter((n) => !n.read_at).length > 0 || count > 0) && (
                                        <i />
                                    )}
                                </button>
                                {notifOpen && (
                                    <div
                                        className="card"
                                        style={{
                                            position: "absolute",
                                            right: 0,
                                            top: 40,
                                            width: 320,
                                            maxHeight: 420,
                                            overflowY: "auto",
                                            zIndex: 100,
                                            boxShadow: "0 12px 35px rgba(0,0,0,0.18)",
                                            display: "flex",
                                            flexDirection: "column",
                                        }}
                                    >
                                        <div
                                            style={{
                                                padding: "12px 16px",
                                                borderBottom: "1px solid var(--border)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                background: "var(--sidebar)",
                                            }}
                                        >
                                            <strong style={{ fontSize: 12 }}>
                                                Notifications ({notifications.filter((n) => !n.read_at).length})
                                            </strong>
                                            {notifications.some((n) => !n.read_at) && (
                                                <button
                                                    style={{
                                                        fontSize: 10,
                                                        color: "var(--accent)",
                                                        cursor: "pointer",
                                                        fontWeight: 550,
                                                    }}
                                                    onClick={async () => {
                                                        await markAllNotificationsRead();
                                                        setNotifications((prev) =>
                                                            prev.map((n) => ({
                                                                ...n,
                                                                read_at: new Date().toISOString(),
                                                            }))
                                                        );
                                                        toast("All notifications marked as read");
                                                    }}
                                                >
                                                    Mark all read
                                                </button>
                                            )}
                                        </div>
                                        <div style={{ padding: "4px 0", maxHeight: 320, overflowY: "auto" }}>
                                            {notifications.length === 0 ? (
                                                <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 11 }}>
                                                    You're all caught up! No new notifications.
                                                </div>
                                            ) : (
                                                notifications.map((n) => (
                                                    <div
                                                        key={n.id}
                                                        onClick={async () => {
                                                            if (!n.read_at) {
                                                                await markNotificationRead(n.id);
                                                                setNotifications((prev) =>
                                                                    prev.map((item) =>
                                                                        item.id === n.id
                                                                            ? { ...item, read_at: new Date().toISOString() }
                                                                            : item
                                                                    )
                                                                );
                                                            }
                                                            setNotifOpen(false);
                                                        }}
                                                        style={{
                                                            padding: "10px 14px",
                                                            borderBottom: "1px solid var(--border)",
                                                            background: !n.read_at ? "var(--soft)" : "transparent",
                                                            cursor: "pointer",
                                                            fontSize: 11,
                                                        }}
                                                    >
                                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                                                            <strong style={{ fontSize: 11.5 }}>{n.title}</strong>
                                                            <small style={{ fontSize: 9.5 }}>{timeAgo(n.created_at)}</small>
                                                        </div>
                                                        <p style={{ margin: 0, color: "var(--muted)", fontSize: 10.5 }}>{n.body}</p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <button
                                className="avatar small-avatar"
                                aria-label="Your account"
                                onClick={() => open("account")}
                            >
                                {initials(data.user.name)}
                            </button>
                        </div>
                    </header>
                    <main className="main-content">
                        {path === "" ? (
                            <Dashboard />
                        ) : base === "ai" ? (
                            <AiChatPage />
                        ) : base === "notes" ? (
                            <NotesPage />
                        ) : base === "team" ? (
                            <TeamPage />
                        ) : base === "admin" ? (
                            <AdminPage />
                        ) : base === "profiles" ? (
                            path.split("/")[1] ? (
                                <ProfileDetail
                                    id={Number(path.split("/")[1])}
                                />
                            ) : (
                                <Profiles />
                            )
                        ) : base === "matching" ? (
                            <Matching />
                        ) : base === "proposals" ? (
                            <Proposals />
                        ) : base === "followups" ? (
                            <WorkPage kind="followup" />
                        ) : base === "meetings" ? (
                            <WorkPage kind="meeting" />
                        ) : base === "reports" ? (
                            <Reports />
                        ) : base === "settings" ? (
                            <SettingsPage />
                        ) : base === "staff" ? (
                            <StaffPage />
                        ) : (
                            <Empty
                                title="Page not found"
                                action={
                                    <Button onClick={() => go("")}>
                                        Back to overview
                                    </Button>
                                }
                            />
                        )}
                        <footer className="workspace-footer">
                            <span>
                                LB Marriage Bureau · Thoughtful tools. Meaningful connections.
                            </span>
                            <span>
                                <ShieldCheck size={12} /> Secure bureau
                                workspace
                            </span>
                        </footer>
                    </main>
                </div>
                <Modal
                    open={!!modal}
                    onClose={close}
                    wide={["profile", "proposal", "share"].includes(
                        modal?.type || "",
                    )}
                    title={
                        {
                            profile: modal?.value?.id
                                ? "Edit profile"
                                : "Create a new profile",
                            proposal: "Create a proposal",
                            share: "Share securely",
                            work: modal?.value?.id
                                ? "Edit activity"
                                : "Plan a follow-up",
                            meeting: "Schedule a meeting",
                            search: "Find it in your workspace",
                            notifications: "Your attention, please",
                            account: "Your account",
                            help: "A thoughtful start",
                        }[modal?.type || ""] || "Workspace"
                    }
                    description={
                        modal?.type === "profile"
                            ? "Build a clear, complete biodata. Only your bureau can access it."
                            : undefined
                    }
                >
                    {modal?.type === "profile" && (
                        <ProfileEditor initial={modal.value} onDone={close} />
                    )}
                    {modal?.type === "proposal" && (
                        <ProposalForm initial={modal.value} onDone={close} />
                    )}
                    {modal?.type === "share" && (
                        <ShareForm initial={modal.value} onDone={close} />
                    )}
                    {["work", "meeting"].includes(modal?.type || "") && (
                        <WorkForm
                            initial={modal?.value}
                            kind={
                                modal?.type === "meeting"
                                    ? "meeting"
                                    : "followup"
                            }
                            onDone={close}
                        />
                    )}
                    {modal?.type === "search" && (
                        <div className="dialog-body">
                            <div className="search-field">
                                <Search size={18} />
                                <input
                                    autoFocus
                                    placeholder="Search profiles by name, city, or profession"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <div className="search-results">
                                {data.profiles
                                    .filter((p) =>
                                        `${p.name} ${p.city} ${p.profession}`
                                            .toLowerCase()
                                            .includes(search.toLowerCase()),
                                    )
                                    .slice(0, 12)
                                    .map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() =>
                                                go("profiles/" + p.id)
                                            }
                                        >
                                            <span className="avatar">
                                                {initials(p.name)}
                                            </span>
                                            <span>
                                                <strong>{p.name}</strong>
                                                <small>
                                                    {p.profession} · {p.city}
                                                </small>
                                            </span>
                                            <ArrowUpRight size={16} />
                                        </button>
                                    ))}
                            </div>
                        </div>
                    )}
                    {modal?.type === "notifications" && (
                        <div className="dialog-body">
                            <p className="muted">
                                Pending follow-ups and family corrections.
                            </p>
                            {data.edits.map((e) => (
                                <button
                                    className="notification-row"
                                    key={"e" + e.id}
                                    onClick={() =>
                                        go("profiles/" + e.profile_id)
                                    }
                                >
                                    Family corrections awaiting review{" "}
                                    <ArrowUpRight size={16} />
                                </button>
                            ))}
                            {data.work
                                .filter((w) => !isDone(w.status))
                                .slice(0, 10)
                                .map((w) => (
                                    <button
                                        className="notification-row"
                                        key={w.id}
                                        onClick={() => {
                                            close();
                                            go(
                                                w.kind === "meeting"
                                                    ? "meetings"
                                                    : "followups",
                                            );
                                        }}
                                    >
                                        <span>
                                            {w.title}
                                            <small>
                                                {date(w.due_at, true)}
                                            </small>
                                        </span>
                                        <ArrowUpRight size={16} />
                                    </button>
                                ))}
                            {!count && !data.edits.length && (
                                <Empty
                                    title="You’re all caught up"
                                    text="New tasks and family responses will appear here."
                                />
                            )}
                        </div>
                    )}
                    {modal?.type === "account" && (
                        <div className="dialog-body">
                            <div className="account-summary">
                                <span className="avatar large-avatar">
                                    {initials(data.user.name)}
                                </span>
                                <h2>{data.user.name}</h2>
                                <p>{data.user.email}</p>
                            </div>
                            <Button variant="outline" onClick={logout}>
                                <LogOut size={16} />
                                Sign out
                            </Button>
                        </div>
                    )}
                    {modal?.type === "help" && (
                        <div className="dialog-body help-list">
                            {[
                                [
                                    "01",
                                    "Add your profiles",
                                    "Record biodata, family details, preferences, and consent.",
                                ],
                                [
                                    "02",
                                    "Find thoughtful matches",
                                    "Review compatibility reasons and shortlist suitable candidates.",
                                ],
                                [
                                    "03",
                                    "Share with confidence",
                                    "Choose permitted fields, set an expiry, and send the private link.",
                                ],
                                [
                                    "04",
                                    "Keep the conversation moving",
                                    "Track family responses and schedule your next follow-up.",
                                ],
                            ].map(([n, t, d]) => (
                                <div key={n}>
                                    <span>{n}</span>
                                    <section>
                                        <h3>{t}</h3>
                                        <p>{d}</p>
                                    </section>
                                </div>
                            ))}
                        </div>
                    )}
                </Modal>
            </div>
        </Context.Provider>
    );
}
