import { createContext, useContext, useEffect, useState } from "react";
import {
    LayoutDashboard,
    Users,
    HeartHandshake,
    Send,
    CalendarClock,
    CalendarDays,
    Network,
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
} from "lucide-react";
import type { State } from "./types";
import { api, initials, isDone, date } from "./lib";
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
import { SettingsPage, StaffPage, NetworkPage } from "./settings";
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
const navigation: [string, [string, typeof Users, string][]][] = [
    [
        "Workspace",
        [
            ["Overview", LayoutDashboard, ""],
            ["Profiles", Users, "profiles"],
            ["Smart matching", HeartHandshake, "matching"],
            ["Proposals", Send, "proposals"],
            ["Follow-ups", CalendarClock, "followups"],
            ["Meetings", CalendarDays, "meetings"],
        ],
    ],
    [
        "Organization",
        [
            ["Bureau network", Network, "network"],
            ["Reports", ChartNoAxesCombined, "reports"],
            ["Staff & roles", Users, "staff"],
            ["Settings", Settings, "settings"],
        ],
    ],
];
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
            localStorage.getItem("rishtahub-theme") || "light",
        );
    const toast = useToast();
    const refresh = async () => {
        setData(await api<State>("/state"));
    };
    useEffect(() => {
        refresh().catch((e) => setError(e.message));
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
        localStorage.setItem("rishtahub-theme", theme);
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
    const activeName =
        navigation.flatMap((g) => g[1]).find((i) => i[2] === base)?.[0] ||
        "Profile details";
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
                            r<span>h</span>
                        </span>
                        <span>
                            rishtahub<span className="brand-dot">.</span>
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
                        {navigation.map(([label, items]) => (
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
                                        {url === "network" && (
                                            <span className="nav-new">NEW</span>
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
                            <button
                                className="notification-button"
                                aria-label="Notifications"
                                onClick={() => open("notifications")}
                            >
                                <Bell size={19} />
                                {count > 0 && <i />}
                            </button>
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
                        {demo && (
                            <div className="demo-indicator">
                                <span />
                                Demo workspace · All profiles are fictional
                            </div>
                        )}
                        {path === "" ? (
                            <Dashboard />
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
                        ) : base === "network" ? (
                            <NetworkPage />
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
                                Thoughtful tools. Meaningful connections.
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
