import { useState } from "react";
import {
    Users,
    HeartHandshake,
    Send,
    CalendarClock,
    Plus,
    ArrowUpRight,
    ArrowRight,
    CalendarDays,
    Check,
    Download,
    Clock,
    ChevronRight,
    TrendingUp,
} from "lucide-react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { useWorkspace } from "./workspace";
import { Button, Card, PageHeading, Badge, Empty } from "./ui";
import { age, date, initials, isDone, pid } from "./lib";
export function Dashboard() {
    const { data, go, open, canWrite } = useWorkspace(),
        [range, setRange] = useState("6");
    const active = data.profiles.filter((p) => p.status === "Active").length,
        pending = data.work.filter(
            (w) => w.kind === "followup" && !isDone(w.status),
        ),
        interested = data.proposals.filter(
            (p) => p.status === "Interested",
        ).length;
    const today = new Date().toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });
    const months = Array.from({ length: Number(range) }, (_, i) => {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - Number(range) + 1 + i);
        return {
            month: d.toLocaleDateString("en", { month: "short" }),
            profiles: data.profiles.filter(
                (p) =>
                    new Date(p.created_at).getMonth() === d.getMonth() &&
                    new Date(p.created_at).getFullYear() === d.getFullYear(),
            ).length,
            proposals: data.proposals.filter(
                (p) =>
                    new Date(p.created_at).getMonth() === d.getMonth() &&
                    new Date(p.created_at).getFullYear() === d.getFullYear(),
            ).length,
        };
    });
    const stats = [
        {
            label: "Total profiles",
            value: data.profiles.length,
            icon: Users,
            sub: `${active} active profiles`,
            tag: "Your directory",
        },
        {
            label: "Proposals shared",
            value: data.proposals.filter((p) => p.status !== "Draft").length,
            icon: Send,
            sub: `${interested} interested families`,
            tag: "Conversations started",
        },
        {
            label: "Pending follow-ups",
            value: pending.length,
            icon: CalendarClock,
            sub: `${pending.filter((w) => new Date(w.due_at) < new Date()).length} need your attention`,
            tag: "Stay connected",
        },
        {
            label: "Successful matches",
            value: data.profiles.filter((p) => p.status === "Matched").length,
            icon: HeartHandshake,
            sub: "Profiles marked as matched",
            tag: "Meaningful milestones",
        },
    ];
    return (
        <>
            <PageHeading
                eyebrow={today}
                title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${data.user.name.split(" ")[0]}`}
                description="Here’s what’s happening at your bureau today."
            >
                <Button variant="outline" onClick={() => go("reports")}>
                    <ChartIcon />
                    View reports
                </Button>
                {canWrite && (
                    <Button onClick={() => open("profile")}>
                        <Plus size={17} />
                        Add profile
                    </Button>
                )}
            </PageHeading>
            <div className="stats-grid">
                {stats.map((s) => (
                    <Card key={s.label} className="stat-card">
                        <div className="stat-label">
                            {s.label}
                            <span className="stat-icon"><s.icon size={20} aria-hidden="true" /></span>
                        </div>
                        <div className="stat-value">
                            {s.value.toLocaleString()}
                        </div>
                        <div className="stat-sub">
                            <span className="tiny-dot" />
                            {s.sub}
                        </div>
                    </Card>
                ))}
            </div>
            <div className="dashboard-main-grid">
                <Card
                    title="Bureau activity"
                    description="New profiles and proposals over time."
                    action={
                        <select
                            aria-label="Activity date range"
                            className="compact-select"
                            value={range}
                            onChange={(e) => setRange(e.target.value)}
                        >
                            <option value="6">Last 6 months</option>
                            <option value="3">Last 3 months</option>
                            <option value="12">Last 12 months</option>
                        </select>
                    }
                >
                    <div className="chart-legend">
                        <span>
                            <i className="legend-dark" />
                            New profiles
                        </span>
                        <span>
                            <i className="legend-light" />
                            Proposals created
                        </span>
                    </div>
                    <div className="activity-chart">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={months}
                                margin={{
                                    top: 15,
                                    right: 20,
                                    left: -22,
                                    bottom: 0,
                                }}
                            >
                                <defs>
                                    <linearGradient id="activity-fill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--text)" stopOpacity={0.12} />
                                        <stop offset="100%" stopColor="var(--text)" stopOpacity={0.01} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    strokeDasharray="3 4"
                                    vertical={false}
                                    stroke="var(--border)"
                                />
                                <XAxis
                                    dataKey="month"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{
                                        fontSize: 11,
                                        fill: "var(--muted)",
                                    }}
                                    dy={10}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{
                                        fontSize: 11,
                                        fill: "var(--muted)",
                                    }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: "var(--surface)",
                                        border: "1px solid var(--border)",
                                        borderRadius: 8,
                                        color: "var(--text)",
                                    }}
                                />
                                <Area
                                    isAnimationActive={false}
                                    type="monotone"
                                    dataKey="profiles"
                                    name="New profiles"
                                    stroke="var(--text)"
                                    fill="url(#activity-fill)"
                                    strokeWidth={2.4}
                                />
                                <Area
                                    isAnimationActive={false}
                                    type="monotone"
                                    dataKey="proposals"
                                    name="Proposals created"
                                    stroke="#a1a1aa"
                                    fill="transparent"
                                    strokeWidth={2}
                                    strokeDasharray="4 4"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="chart-footer">
                        <TrendingUp size={15} />
                        <span>
                            Every connection begins with a conversation.
                        </span>
                    </div>
                </Card>
                <Card
                    title="Today’s focus"
                    description="Small actions. Meaningful next steps."
                    action={
                        <span className="count-pill">{pending.length}</span>
                    }
                >
                    <div className="focus-list">
                        {pending.slice(0, 3).map((w, i) => (
                            <button
                                key={w.id}
                                className="focus-item"
                                onClick={() =>
                                    canWrite ? open("work", w) : go("followups")
                                }
                            >
                                <span className={"focus-icon focus-" + i}>
                                    {w.type === "WhatsApp" ? (
                                        <Send size={17} />
                                    ) : w.type === "Meeting" ? (
                                        <Users size={17} />
                                    ) : (
                                        <CalendarClock size={17} />
                                    )}
                                </span>
                                <span>
                                    <strong>{w.title}</strong>
                                    <small>
                                        {data.profiles.find(
                                            (p) => p.id === w.profile_id,
                                        )?.name || "Bureau task"}
                                    </small>
                                    <em
                                        className={
                                            new Date(w.due_at) < new Date()
                                                ? "overdue"
                                                : ""
                                        }
                                    >
                                        {new Date(w.due_at) < new Date()
                                            ? "Overdue · "
                                            : ""}
                                        {date(w.due_at, true)}
                                    </em>
                                </span>
                                <ChevronRight size={15} />
                            </button>
                        ))}
                        {!pending.length && (
                            <Empty
                                title="All caught up"
                                text="Your next follow-up will appear here."
                            />
                        )}
                    </div>
                    <button
                        className="card-footer-button"
                        onClick={() => go("followups")}
                    >
                        View all follow-ups
                        <ArrowRight size={15} />
                    </button>
                </Card>
            </div>
            <div className="dashboard-bottom-grid">
                <Card
                    title="Recently added profiles"
                    description="New possibilities in your directory."
                    action={
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => go("profiles")}
                        >
                            View all
                            <ArrowUpRight size={14} />
                        </Button>
                    }
                >
                    <div className="table-scroll">
                        <table>
                            <thead>
                                <tr>
                                    <th>Profile</th>
                                    <th>Location</th>
                                    <th>Status</th>
                                    <th>Added</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {data.profiles.slice(0, 5).map((p) => (
                                    <tr key={p.id}>
                                        <td>
                                            <button
                                                className="person"
                                                onClick={() =>
                                                    go("profiles/" + p.id)
                                                }
                                            >
                                                <span
                                                    className={
                                                        "avatar avatar-" +
                                                        (p.gender === "Female"
                                                            ? "rose"
                                                            : "sage")
                                                    }
                                                >
                                                    {initials(p.name)}
                                                </span>
                                                <span>
                                                    <strong>{p.name}</strong>
                                                    <small>
                                                        {age(p.dob)} yrs ·{" "}
                                                        {p.profession ||
                                                            "Profession not set"}
                                                    </small>
                                                </span>
                                            </button>
                                        </td>
                                        <td>{p.city}</td>
                                        <td>
                                            <Badge>{p.status}</Badge>
                                        </td>
                                        <td className="muted">
                                            {date(p.created_at)}
                                        </td>
                                        <td>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                aria-label={`View ${p.name}`}
                                                onClick={() =>
                                                    go("profiles/" + p.id)
                                                }
                                            >
                                                <ArrowUpRight size={16} />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {!data.profiles.length && (
                            <Empty
                                title="Your first connection starts here"
                                text="Add a profile to start building your bureau’s directory."
                            />
                        )}
                    </div>
                </Card>
                <Card
                    title="Recent activity"
                    description="Your bureau, at a glance."
                >
                    <div className="timeline">
                        {data.activities
                            .filter(
                                (a) =>
                                    a.action !== "view" &&
                                    a.action !== "file-view",
                            )
                            .slice(0, 5)
                            .map((a, i) => (
                                <div className="timeline-item" key={a.id}>
                                    <span
                                        className={
                                            "timeline-dot " +
                                            (!i ? "filled" : "")
                                        }
                                    >
                                        <Check size={10} />
                                    </span>
                                    <div>
                                        <p>{a.description}</p>
                                        <small>
                                            {date(a.created_at, true)}
                                        </small>
                                    </div>
                                </div>
                            ))}
                        {!data.activities.length && (
                            <Empty text="Your team’s activity will appear here." />
                        )}
                    </div>
                </Card>
            </div>
            <div className="connection-banner">
                <div className="banner-symbol">
                    <HeartHandshake size={25} />
                </div>
                <div>
                    <h3>A good match starts with the right details.</h3>
                    <p>
                        Keep profiles complete and preferences up to date for
                        more thoughtful suggestions.
                    </p>
                </div>
                <Button variant="outline" onClick={() => go("matching")}>
                    Explore matches
                    <ArrowRight size={16} />
                </Button>
            </div>
        </>
    );
}
function ChartIcon() {
    return <TrendingUp size={16} />;
}
export function Reports() {
    const { data, owner } = useWorkspace();
    const [period, setPeriod] = useState("all");
    const from = period === "all" ? 0 : Date.now() - Number(period) * 86400000;
    const profiles = data.profiles.filter(
            (p) => new Date(p.created_at).getTime() >= from,
        ),
        proposals = data.proposals.filter(
            (p) => new Date(p.created_at).getTime() >= from,
        );
    const statuses = [
        "Draft",
        "Shared",
        "Viewed",
        "Interested",
        "Meeting Planned",
        "Closed",
    ];
    return (
        <>
            <PageHeading
                title="Reports & insights"
                description="Understand your bureau’s progress, one connection at a time."
            >
                <select
                    aria-label="Report period"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                >
                    <option value="all">All time</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                </select>
                {owner && (
                    <Button variant="outline" asChild>
                        <a href="/api/export">
                            <Download size={16} />
                            Export directory
                        </a>
                    </Button>
                )}
            </PageHeading>
            <div className="stats-grid">
                {[
                    ["Profiles created", profiles.length],
                    [
                        "Active profiles",
                        profiles.filter((p) => p.status === "Active").length,
                    ],
                    [
                        "Meetings completed",
                        data.work.filter(
                            (w) =>
                                w.kind === "meeting" &&
                                w.status === "Completed" &&
                                new Date(w.due_at).getTime() >= from,
                        ).length,
                    ],
                    [
                        "Matched profiles",
                        profiles.filter((p) => p.status === "Matched").length,
                    ],
                ].map(([l, v]) => (
                    <Card className="stat-card" key={l}>
                        <div className="stat-label">{l}</div>
                        <div className="stat-value">{v}</div>
                    </Card>
                ))}
            </div>
            <div className="two-col">
                <Card
                    title="Proposal pipeline"
                    description="Current proposal stages in the selected period."
                >
                    <div className="report-bars">
                        {statuses.map((s) => (
                            <div key={s}>
                                <div>
                                    <span>{s}</span>
                                    <strong>
                                        {
                                            proposals.filter(
                                                (p) => p.status === s,
                                            ).length
                                        }
                                    </strong>
                                </div>
                                <div className="progress-track">
                                    <span
                                        style={{
                                            width: `${proposals.length ? (100 * proposals.filter((p) => p.status === s).length) / proposals.length : 0}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
                <Card
                    title="Staff workload"
                    description="Current assignments across follow-ups and meetings."
                >
                    <div className="staff-workload">
                        {data.staff.map((s) => (
                            <div key={s.id}>
                                <span className="avatar">
                                    {initials(s.name)}
                                </span>
                                <div>
                                    <strong>{s.name}</strong>
                                    <small>{s.role}</small>
                                </div>
                                <span>
                                    {
                                        data.work.filter(
                                            (w) =>
                                                w.assigned_to === s.id &&
                                                !isDone(w.status),
                                        ).length
                                    }{" "}
                                    open
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
            <Card
                title="Follow-up completion"
                description="Tasks due in the selected period."
            >
                <div className="report-summary">
                    <span className="big-number">
                        {
                            data.work.filter(
                                (w) =>
                                    w.kind === "followup" &&
                                    w.status === "Completed" &&
                                    new Date(w.due_at).getTime() >= from,
                            ).length
                        }
                    </span>
                    <span>
                        completed of{" "}
                        {
                            data.work.filter(
                                (w) =>
                                    w.kind === "followup" &&
                                    new Date(w.due_at).getTime() >= from,
                            ).length
                        }{" "}
                        follow-ups
                    </span>
                </div>
            </Card>
        </>
    );
}
