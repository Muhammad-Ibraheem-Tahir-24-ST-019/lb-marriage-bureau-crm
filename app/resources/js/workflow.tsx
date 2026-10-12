import { useState } from "react";
import {
    Plus,
    Send,
    Share2,
    ArrowUpRight,
    Clock,
    CheckCircle2,
    CalendarDays,
    MapPin,
    Copy,
    LockKeyhole,
    ShieldCheck,
    List,
    Columns3,
    Calendar,
    Check,
    Link2,
    X,
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
    useToast,
    Modal,
} from "./ui";
import { api, date, initials, isDone, copy, pid } from "./lib";
import type { Work } from "./types";
export function Proposals() {
    const { data, open, canWrite, refresh, go } = useWorkspace(),
        toast = useToast();
    const [filter, setFilter] = useState("All proposals"),
        [detail, setDetail] = useState<number | null>(null);
    const proposal = data.proposals.find((p) => p.id === detail);
    const change = async (id: number, status: string) => {
        try {
            await api("/proposals/" + id, "PUT", { status });
            await refresh();
            toast("Proposal updated");
        } catch (e: any) {
            toast(e.message, true);
        }
    };
    return (
        <>
            <PageHeading
                eyebrow="From possibility to connection"
                title="Proposals"
                description="Share thoughtfully. Follow the conversation. Keep everyone in sync."
            >
                {canWrite && (
                    <Button onClick={() => open("proposal")}>
                        <Plus size={17} />
                        Create proposal
                    </Button>
                )}
            </PageHeading>
            <div className="mini-stats">
                {[
                    ["Total proposals", data.proposals.length],
                    [
                        "Awaiting response",
                        data.proposals.filter((p) =>
                            ["Shared", "Viewed"].includes(p.status),
                        ).length,
                    ],
                    [
                        "Interested families",
                        data.proposals.filter((p) => p.status === "Interested")
                            .length,
                    ],
                    [
                        "Meetings planned",
                        data.proposals.filter(
                            (p) => p.status === "Meeting Planned",
                        ).length,
                    ],
                ].map(([l, v]) => (
                    <div key={l}>
                        <span>{l}</span>
                        <strong>{v}</strong>
                    </div>
                ))}
            </div>
            <div className="tabs-line">
                {[
                    "All proposals",
                    "Draft",
                    "Shared",
                    "Viewed",
                    "Interested",
                    "Closed",
                ].map((t) => (
                    <button
                        key={t}
                        className={filter === t ? "active" : ""}
                        onClick={() => setFilter(t)}
                    >
                        {t}
                    </button>
                ))}
            </div>
            <div className="proposal-grid">
                {data.proposals
                    .filter(
                        (p) =>
                            filter === "All proposals" || p.status === filter,
                    )
                    .map((p) => (
                        <Card className="proposal-card" key={p.id}>
                            <div className="profile-card-top">
                                <span className="square-icon">
                                    <Send size={19} />
                                </span>
                                <Badge>{p.status}</Badge>
                            </div>
                            <h3>{p.title}</h3>
                            <p>
                                For{" "}
                                {data.profiles.find(
                                    (x) => x.id === p.profile_id,
                                )?.name || "Archived profile"}
                            </p>
                            <div className="proposal-people">
                                {p.candidates.slice(0, 4).map((c) => (
                                    <span className="avatar" key={c.id}>
                                        {initials(
                                            data.profiles.find(
                                                (x) => x.id === c.profile_id,
                                            )?.name || "Archived",
                                        )}
                                    </span>
                                ))}
                                <span>
                                    {p.candidates.length} proposed{" "}
                                    {p.candidates.length === 1
                                        ? "profile"
                                        : "profiles"}
                                </span>
                            </div>
                            <div className="proposal-meta">
                                <span>
                                    <Clock size={14} />
                                    {date(p.created_at)}
                                </span>
                                <span>
                                    {p.links.reduce((n, l) => n + l.views, 0)}{" "}
                                    link views
                                </span>
                            </div>
                            <div className="match-actions">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDetail(p.id)}
                                >
                                    View details
                                    <ArrowUpRight size={14} />
                                </Button>
                                {canWrite && (
                                    <Button
                                        size="sm"
                                        onClick={() =>
                                            open("share", {
                                                kind: "proposal",
                                                proposal_id: p.id,
                                            })
                                        }
                                    >
                                        <Share2 size={14} />
                                        Share
                                    </Button>
                                )}
                            </div>
                        </Card>
                    ))}
            </div>
            {!data.proposals.length && (
                <Card>
                    <Empty
                        title="A thoughtful introduction starts here"
                        text="Choose a profile, add suitable candidates, and create a private proposal."
                        action={
                            canWrite && (
                                <Button onClick={() => open("proposal")}>
                                    Create your first proposal
                                </Button>
                            )
                        }
                    />
                </Card>
            )}
            <Modal
                open={!!proposal}
                onClose={() => setDetail(null)}
                title={proposal?.title || "Proposal"}
                description="Family responses are tracked separately for each candidate."
                wide
            >
                {proposal && (
                    <div className="dialog-body">
                        <div className="toolbar">
                            <Badge>{proposal.status}</Badge>
                            {canWrite && (
                                <select
                                    aria-label="Proposal stage"
                                    value={proposal.status}
                                    onChange={(e) =>
                                        change(proposal.id, e.target.value)
                                    }
                                >
                                    {[
                                        "Draft",
                                        "Shared",
                                        "Viewed",
                                        "Interested",
                                        "Not Interested",
                                        "Meeting Planned",
                                        "Closed",
                                    ].map((s) => (
                                        <option key={s}>{s}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <h3>Proposed profiles</h3>
                        {proposal.candidates.map((c) => (
                            <div className="response-row" key={c.id}>
                                <button
                                    className="person"
                                    onClick={() => {
                                        setDetail(null);
                                        go("profiles/" + c.profile_id);
                                    }}
                                >
                                    <span className="avatar">
                                        {initials(
                                            data.profiles.find(
                                                (x) => x.id === c.profile_id,
                                            )?.name || "Archived",
                                        )}
                                    </span>
                                    <span>
                                        <strong>
                                            {data.profiles.find(
                                                (x) => x.id === c.profile_id,
                                            )?.name || "Archived profile"}
                                        </strong>
                                        <small>
                                            {c.message ||
                                                "No message from family yet"}
                                        </small>
                                    </span>
                                </button>
                                <Badge>
                                    {c.response || "Awaiting response"}
                                </Badge>
                            </div>
                        ))}
                        <h3 className="mt-20">Shared links</h3>
                        {proposal.links.map((l) => (
                            <div className="simple-row" key={l.id}>
                                <span>
                                    <Link2 size={14} /> Link #{l.id}
                                    <small>
                                        Expires {date(l.expires_at)} · {l.views}{" "}
                                        views
                                    </small>
                                </span>
                                {l.revoked_at ? (
                                    <Badge>Revoked</Badge>
                                ) : new Date(l.expires_at) < new Date() ? (
                                    <Badge>Expired</Badge>
                                ) : (
                                    canWrite && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={async () => {
                                                try {
                                                    await api(
                                                        "/links/" + l.id,
                                                        "DELETE",
                                                    );
                                                    await refresh();
                                                    toast("Link revoked");
                                                } catch (e: any) {
                                                    toast(e.message, true);
                                                }
                                            }}
                                        >
                                            Revoke link
                                        </Button>
                                    )
                                )}
                            </div>
                        ))}
                        {!proposal.links.length && (
                            <p className="muted">No links have been created.</p>
                        )}
                        {proposal.notes && (
                            <>
                                <h3 className="mt-20">Internal notes</h3>
                                <p>{proposal.notes}</p>
                            </>
                        )}
                    </div>
                )}
            </Modal>
        </>
    );
}
export function ProposalForm({
    initial,
    onDone,
}: {
    initial?: any;
    onDone: () => void;
}) {
    const { data, refresh } = useWorkspace(),
        toast = useToast();
    const [form, setForm] = useState({
            title: "",
            profile_id: initial?.profile_id || "",
            candidate_ids: initial?.candidate_ids || ([] as number[]),
            notes: "",
        }),
        [error, setError] = useState(""),
        [busy, setBusy] = useState(false);
    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
            await api("/proposals", "POST", form);
            await refresh();
            toast("Proposal created. Choose Share to create a family link.");
            onDone();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };
    return (
        <form onSubmit={submit}>
            <div className="dialog-body stack">
                <ErrorBox message={error} />
                <div className="form-grid">
                    <Field label="Proposal title *">
                        <input
                            required
                            placeholder="A thoughtful shortlist for the Khan family"
                            value={form.title}
                            onChange={(e) =>
                                setForm({ ...form, title: e.target.value })
                            }
                        />
                    </Field>
                    <Field label="Create proposal for *">
                        <select
                            required
                            value={form.profile_id}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    profile_id: Number(e.target.value),
                                    candidate_ids: [],
                                })
                            }
                        >
                            <option value="">Select a profile</option>
                            {data.profiles.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                </div>
                <Field label="Select candidates (up to 10)">
                    <div className="candidate-picker">
                        {data.profiles
                            .filter(
                                (p) =>
                                    p.id !== Number(form.profile_id) &&
                                    p.status === "Active",
                            )
                            .map((p) => (
                                <label key={p.id} className="candidate-option">
                                    <input
                                        type="checkbox"
                                        checked={form.candidate_ids.includes(
                                            p.id,
                                        )}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                candidate_ids: e.target.checked
                                                    ? [
                                                          ...form.candidate_ids,
                                                          p.id,
                                                      ]
                                                    : form.candidate_ids.filter(
                                                          (id: number) =>
                                                              id !== p.id,
                                                      ),
                                            })
                                        }
                                    />
                                    <span className="avatar">
                                        {initials(p.name)}
                                    </span>
                                    <span>
                                        <strong>{p.name}</strong>
                                        <small>
                                            {p.city} · {p.profession}
                                        </small>
                                    </span>
                                </label>
                            ))}
                    </div>
                </Field>
                <Field label="Internal notes">
                    <textarea
                        value={form.notes}
                        onChange={(e) =>
                            setForm({ ...form, notes: e.target.value })
                        }
                    />
                </Field>
            </div>
            <div className="dialog-footer">
                <span className="muted">
                    {form.candidate_ids.length} candidates selected
                </span>
                <Button type="submit" disabled={busy}>
                    {busy ? "Creating…" : "Create proposal"}
                </Button>
            </div>
        </form>
    );
}
export function ShareForm({
    initial,
    onDone,
}: {
    initial: any;
    onDone: () => void;
}) {
    const { refresh } = useWorkspace(),
        toast = useToast();
    const [form, setForm] = useState({
            ...initial,
            days: 7,
            password: "",
            fields:
                initial.kind === "edit"
                    ? ["name", "city", "education", "profession"]
                    : [
                          "name",
                          "dob",
                          "city",
                          "education",
                          "profession",
                          "marital_status",
                      ],
            photos: false,
        }),
        [url, setUrl] = useState(""),
        [busy, setBusy] = useState(false),
        [error, setError] = useState("");
    const labels: Record<string, string> = {
        name: "Name",
        dob: "Age (not date of birth)",
        city: "City",
        country: "Country",
        profession: "Profession",
        education: "Education",
        marital_status: "Marital status",
        religion: "Religion",
        sect: "Sect",
        family: "Family overview",
        preferences: "Partner preferences",
        phone: "Phone number — private by default",
    };
    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
            const res = await api("/links", "POST", form);
            setUrl(res.url);
            await refresh();
            toast("Secure link created");
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };
    return url ? (
        <div className="dialog-body stack">
            <div className="success-illustration">
                <CheckCircle2 size={34} />
            </div>
            <h2>Your private link is ready.</h2>
            <p className="muted">
                Copy it now and send it to the intended family. The link itself
                is not stored in readable form.
            </p>
            <input
                aria-label="Secure share link"
                readOnly
                value={url}
                onFocus={(e) => e.target.select()}
            />
            <div className="toolbar">
                <Button
                    onClick={async () => {
                        try {
                            await copy(url);
                            toast("Link copied");
                        } catch {
                            toast("Select and copy the link manually", true);
                        }
                    }}
                >
                    <Copy size={16} />
                    Copy link
                </Button>
                <Button variant="outline" asChild>
                    <a href={url} target="_blank" rel="noreferrer">
                        Preview link
                        <ArrowUpRight size={15} />
                    </a>
                </Button>
                <Button variant="ghost" onClick={onDone}>
                    Done
                </Button>
            </div>
        </div>
    ) : (
        <form onSubmit={submit}>
            <div className="dialog-body stack">
                <ErrorBox message={error} />
                <div className="notice">
                    <ShieldCheck size={20} />
                    <span>
                        Only selected fields will be returned to the family.
                        Internal notes and identity documents are never shared.
                    </span>
                </div>
                <div className="form-grid">
                    <Field label="Link expires in">
                        <select
                            value={form.days}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    days: Number(e.target.value),
                                })
                            }
                        >
                            {[1, 3, 7, 14, 30].map((n) => (
                                <option key={n} value={n}>
                                    {n} {n === 1 ? "day" : "days"}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Password (optional, at least 8 characters)">
                        <input
                            type="password"
                            minLength={8}
                            value={form.password}
                            onChange={(e) =>
                                setForm({ ...form, password: e.target.value })
                            }
                        />
                    </Field>
                </div>
                <h3>Visible information</h3>
                <div className="share-fields">
                    {Object.entries(labels)
                        .filter(
                            ([k]) =>
                                initial.kind !== "edit" ||
                                [
                                    "name",
                                    "city",
                                    "education",
                                    "profession",
                                    "phone",
                                ].includes(k),
                        )
                        .map(([key, label]) => (
                            <label className="checkbox-row" key={key}>
                                <input
                                    type="checkbox"
                                    checked={form.fields.includes(key)}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            fields: e.target.checked
                                                ? [...form.fields, key]
                                                : form.fields.filter(
                                                      (x: string) => x !== key,
                                                  ),
                                        })
                                    }
                                />
                                {label}
                            </label>
                        ))}
                </div>
                <label className="checkbox-row">
                    <input
                        type="checkbox"
                        checked={form.photos}
                        onChange={(e) =>
                            setForm({ ...form, photos: e.target.checked })
                        }
                    />
                    Include profile photos
                </label>
                {form.fields.includes("phone") && (
                    <div className="notice amber-notice">
                        The recipient will be able to see contact numbers.
                        Confirm that you have permission to share them.
                    </div>
                )}
            </div>
            <div className="dialog-footer">
                <span className="muted">
                    <LockKeyhole size={14} />
                    Revocable at any time
                </span>
                <Button type="submit" disabled={busy}>
                    {busy ? "Creating…" : "Create secure link"}
                </Button>
            </div>
        </form>
    );
}
export function WorkPage({ kind }: { kind: string }) {
    const { data, open, canWrite, refresh } = useWorkspace(),
        toast = useToast();
    const [view, setView] = useState("list"),
        [filter, setFilter] = useState("Open");
    const all = data.work.filter((w) => w.kind === kind),
        rows = all.filter(
            (w) =>
                filter === "All" ||
                (filter === "Open"
                    ? !isDone(w.status)
                    : w.status === "Completed"),
        );
    const complete = async (w: Work) => {
        try {
            await api("/work/" + w.id, "PUT", { ...w, status: "Completed" });
            await refresh();
            toast("Activity completed");
        } catch (e: any) {
            toast(e.message, true);
        }
    };
    const task = (w: Work) => (
        <div className="task-card" key={w.id}>
            <div className="task-card-head">
                <Badge>{w.type}</Badge>
                {canWrite && (
                    <button
                        aria-label={`Complete ${w.title}`}
                        className="task-check"
                        disabled={isDone(w.status)}
                        onClick={() => complete(w)}
                    >
                        <Check size={14} />
                    </button>
                )}
            </div>
            <button
                className="task-title"
                onClick={() =>
                    canWrite && open(kind === "meeting" ? "meeting" : "work", w)
                }
            >
                {w.title}
            </button>
            <p>
                {data.profiles.find((p) => p.id === w.profile_id)?.name ||
                    "Bureau activity"}
            </p>
            <div
                className={
                    "task-due " +
                    (!isDone(w.status) && new Date(w.due_at) < new Date()
                        ? "overdue"
                        : "")
                }
            >
                <Clock size={13} />
                {date(w.due_at, true)}
            </div>
            {w.location && (
                <div className="task-due">
                    <MapPin size={13} />
                    {w.location}
                </div>
            )}
            <div className="task-bottom">
                <span className="avatar small-avatar">
                    {initials(
                        data.staff.find((s) => s.id === w.assigned_to)?.name ||
                            "Unassigned",
                    )}
                </span>
                <small>
                    {data.staff.find((s) => s.id === w.assigned_to)?.name ||
                        "Unassigned"}
                </small>
                <Badge>{w.status}</Badge>
            </div>
        </div>
    );
    return (
        <>
            <PageHeading
                eyebrow={
                    kind === "meeting"
                        ? "Make space for connection"
                        : "Keep conversations moving"
                }
                title={kind === "meeting" ? "Meetings" : "Follow-ups"}
                description={
                    kind === "meeting"
                        ? "Coordinate introductions, conversations, and the next chapter."
                        : "The right follow-up, at the right time. Nothing falls through the cracks."
                }
            >
                {canWrite && (
                    <Button
                        onClick={() =>
                            open(kind === "meeting" ? "meeting" : "work")
                        }
                    >
                        <Plus size={17} />
                        {kind === "meeting"
                            ? "Schedule meeting"
                            : "Add follow-up"}
                    </Button>
                )}
            </PageHeading>
            <div className="toolbar">
                <div className="tabs-pills">
                    {["Open", "Completed", "All"].map((t) => (
                        <button
                            key={t}
                            className={filter === t ? "active" : ""}
                            onClick={() => setFilter(t)}
                        >
                            {t}
                        </button>
                    ))}
                </div>
                <div className="segmented">
                    {[
                        ["list", List],
                        ["board", Columns3],
                        ["calendar", Calendar],
                    ].map(([v, Icon]: any) => (
                        <button
                            key={v}
                            aria-label={`${v} view`}
                            className={view === v ? "active" : ""}
                            onClick={() => setView(v)}
                        >
                            <Icon size={17} />
                        </button>
                    ))}
                </div>
            </div>
            {!rows.length ? (
                <Card>
                    <Empty
                        title="A little breathing room"
                        text="No activities match this view. Schedule the next step when you’re ready."
                    />
                </Card>
            ) : view === "board" ? (
                <div className="kanban">
                    {(kind === "meeting"
                        ? ["Proposed", "Confirmed", "Completed"]
                        : ["Pending", "In progress", "Completed"]
                    ).map((s) => (
                        <div className="kanban-column" key={s}>
                            <h3>
                                <span className="tiny-dot" />
                                {s}
                                <span>
                                    {rows.filter((w) => w.status === s).length}
                                </span>
                            </h3>
                            {rows.filter((w) => w.status === s).map(task)}
                        </div>
                    ))}
                </div>
            ) : view === "calendar" ? (
                <div className="agenda">
                    {[...new Set(rows.map((w) => w.due_at.slice(0, 10)))]
                        .sort()
                        .map((d) => (
                            <div className="agenda-day" key={d}>
                                <div>
                                    <strong>{date(d)}</strong>
                                    <small>
                                        {new Date(d).toLocaleDateString("en", {
                                            weekday: "long",
                                        })}
                                    </small>
                                </div>
                                <div>
                                    {rows
                                        .filter((w) => w.due_at.startsWith(d))
                                        .map(task)}
                                </div>
                            </div>
                        ))}
                </div>
            ) : (
                <div className="work-grid">{rows.map(task)}</div>
            )}
        </>
    );
}
export function WorkForm({
    initial,
    kind,
    onDone,
}: {
    initial?: Work;
    kind: string;
    onDone: () => void;
}) {
    const { data, refresh } = useWorkspace(),
        toast = useToast();
    const [form, setForm] = useState<any>({
            kind,
            title: "",
            profile_id: "",
            assigned_to: data.user.id,
            type: kind === "meeting" ? "Meeting" : "Call",
            status: kind === "meeting" ? "Proposed" : "Pending",
            due_at: "",
            notes: "",
            location: "",
            ...initial,
            ...(initial?.due_at
                ? { due_at: initial.due_at.replace(" ", "T").slice(0, 16) }
                : {}),
        }),
        [error, setError] = useState(""),
        [busy, setBusy] = useState(false),
        [deleting, setDeleting] = useState(false);
    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
            await api(
                "/work" + (initial?.id ? "/" + initial.id : ""),
                initial?.id ? "PUT" : "POST",
                {
                    ...form,
                    profile_id: form.profile_id || null,
                    assigned_to: form.assigned_to || null,
                },
            );
            await refresh();
            toast("Activity saved");
            onDone();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };
    return (
        <form onSubmit={submit}>
            <div className="dialog-body stack">
                <ErrorBox message={error} />
                <Field label="Title *">
                    <input
                        required
                        value={form.title}
                        onChange={(e) =>
                            setForm({ ...form, title: e.target.value })
                        }
                        placeholder={
                            kind === "meeting"
                                ? "Introduction between families"
                                : "Call family about the shortlist"
                        }
                    />
                </Field>
                <div className="form-grid">
                    <Field label="Related profile">
                        <select
                            value={form.profile_id || ""}
                            onChange={(e) =>
                                setForm({ ...form, profile_id: e.target.value })
                            }
                        >
                            <option value="">No profile</option>
                            {data.profiles.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Assigned to">
                        <select
                            value={form.assigned_to || ""}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    assigned_to: e.target.value,
                                })
                            }
                        >
                            <option value="">Unassigned</option>
                            {data.staff
                                .filter((s) => s.active)
                                .map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                        </select>
                    </Field>
                    <Field label="Date and time *">
                        <input
                            required
                            type="datetime-local"
                            value={form.due_at}
                            onChange={(e) =>
                                setForm({ ...form, due_at: e.target.value })
                            }
                        />
                    </Field>
                    <Field label="Type">
                        <select
                            value={form.type}
                            onChange={(e) =>
                                setForm({ ...form, type: e.target.value })
                            }
                        >
                            {[
                                "Call",
                                "WhatsApp",
                                "Meeting",
                                "Document",
                                "Reminder",
                            ].map((t) => (
                                <option key={t}>{t}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Status">
                        <select
                            value={form.status}
                            onChange={(e) =>
                                setForm({ ...form, status: e.target.value })
                            }
                        >
                            {(kind === "meeting"
                                ? [
                                      "Proposed",
                                      "Confirmed",
                                      "Completed",
                                      "Cancelled",
                                  ]
                                : [
                                      "Pending",
                                      "In progress",
                                      "Completed",
                                      "Cancelled",
                                  ]
                            ).map((t) => (
                                <option key={t}>{t}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Location or meeting link">
                        <input
                            value={form.location || ""}
                            onChange={(e) =>
                                setForm({ ...form, location: e.target.value })
                            }
                        />
                    </Field>
                </div>
                <Field label="Notes and outcome">
                    <textarea
                        value={form.notes || ""}
                        onChange={(e) =>
                            setForm({ ...form, notes: e.target.value })
                        }
                    />
                </Field>
                {deleting && (
                    <div className="error">
                        Delete this activity permanently?{" "}
                        <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            onClick={async () => {
                                try {
                                    await api("/work/" + initial?.id, "DELETE");
                                    await refresh();
                                    onDone();
                                    toast("Activity deleted");
                                } catch (e: any) {
                                    setError(e.message);
                                }
                            }}
                        >
                            Confirm delete
                        </Button>
                    </div>
                )}
            </div>
            <div className="dialog-footer">
                {initial?.id ? (
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setDeleting(!deleting)}
                    >
                        Delete activity
                    </Button>
                ) : (
                    <span />
                )}
                <Button type="submit" disabled={busy}>
                    {busy ? "Saving…" : "Save activity"}
                </Button>
            </div>
        </form>
    );
}
