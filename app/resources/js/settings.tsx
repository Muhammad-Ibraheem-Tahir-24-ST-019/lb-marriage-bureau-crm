import { useEffect, useState } from "react";
import {
    Save,
    Plus,
    ShieldCheck,
    Users,
    Globe,
    ArrowUpRight,
    Copy,
    Network,
    LockKeyhole,
    MapPin,
    Send,
    Building2,
    Check,
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
import { api, initials, copy, pid, date } from "./lib";
export function SettingsPage() {
    const { data, owner, refresh } = useWorkspace(),
        toast = useToast();
    const [tab, setTab] = useState("General"),
        [form, setForm] = useState({
            name: data.bureau.name,
            settings: { ...data.bureau.settings },
        }),
        [busy, setBusy] = useState(false),
        [error, setError] = useState("");
    const set = (k: string, v: any) =>
        setForm({ ...form, settings: { ...form.settings, [k]: v } });
    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
            await api("/settings", "PUT", form);
            await refresh();
            toast("Bureau settings saved");
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };
    return (
        <>
            <PageHeading
                title="Bureau settings"
                description="Make the workspace yours. Keep privacy at the center."
            >
                <Button variant="outline" asChild>
                    <a
                        href={"/bureau/" + data.bureau.slug}
                        target="_blank"
                        rel="noreferrer"
                    >
                        View public page
                        <ArrowUpRight size={15} />
                    </a>
                </Button>
            </PageHeading>
            <div className="settings-layout">
                <div className="settings-nav">
                    {[
                        "General",
                        "Privacy & network",
                        "Matching preferences",
                        "Message templates",
                    ].map((t) => (
                        <button
                            key={t}
                            className={tab === t ? "active" : ""}
                            onClick={() => setTab(t)}
                        >
                            {t}
                        </button>
                    ))}
                </div>
                <form onSubmit={submit}>
                    <ErrorBox message={error} />
                    {!owner && (
                        <div className="notice">
                            <LockKeyhole size={18} />
                            Only the bureau owner can change these settings.
                        </div>
                    )}
                    <fieldset disabled={!owner || busy}>
                        {tab === "General" && (
                            <Card
                                title="Bureau identity"
                                description="These details appear on your public bureau page."
                            >
                                <div className="dialog-body stack">
                                    <Field label="Bureau name">
                                        <input
                                            required
                                            value={form.name}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    name: e.target.value,
                                                })
                                            }
                                        />
                                    </Field>
                                    <div className="form-grid">
                                        <Field label="City">
                                            <input
                                                value={form.settings.city || ""}
                                                onChange={(e) =>
                                                    set("city", e.target.value)
                                                }
                                            />
                                        </Field>
                                        <Field label="Public contact number">
                                            <input
                                                value={
                                                    form.settings.phone || ""
                                                }
                                                onChange={(e) =>
                                                    set("phone", e.target.value)
                                                }
                                            />
                                        </Field>
                                        <Field label="Website">
                                            <input
                                                type="url"
                                                placeholder="https://"
                                                value={
                                                    form.settings.website || ""
                                                }
                                                onChange={(e) =>
                                                    set(
                                                        "website",
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </Field>
                                        <Field label="Accent color">
                                            <div className="color-input">
                                                <input
                                                    type="color"
                                                    value={form.settings.accent}
                                                    onChange={(e) =>
                                                        set(
                                                            "accent",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                                <span>
                                                    {form.settings.accent}
                                                </span>
                                            </div>
                                        </Field>
                                    </div>
                                    <Field label="About your bureau">
                                        <textarea
                                            rows={4}
                                            value={form.settings.about || ""}
                                            onChange={(e) =>
                                                set("about", e.target.value)
                                            }
                                        />
                                    </Field>
                                    <Field label="Bureau address">
                                        <textarea
                                            value={form.settings.address || ""}
                                            onChange={(e) =>
                                                set("address", e.target.value)
                                            }
                                        />
                                    </Field>
                                </div>
                            </Card>
                        )}
                        {tab === "Privacy & network" && (
                            <Card
                                title="Privacy comes first"
                                description="Your private profiles are never listed on a public directory."
                            >
                                <div className="dialog-body stack">
                                    <div className="setting-row">
                                        <div>
                                            <h3>
                                                Participate in the bureau
                                                network
                                            </h3>
                                            <p>
                                                Other participating bureaus can
                                                see profile IDs, gender, city,
                                                and age bands for active,
                                                consented profiles. Names,
                                                photos, contacts, and notes
                                                remain private.
                                            </p>
                                        </div>
                                        <input
                                            aria-label="Enable bureau network"
                                            type="checkbox"
                                            role="switch"
                                            checked={form.settings.network}
                                            onChange={(e) =>
                                                set("network", e.target.checked)
                                            }
                                        />
                                    </div>
                                    <div className="notice">
                                        <ShieldCheck size={20} />
                                        <span>
                                            Enable only when consent covers
                                            network discovery. Accepting an
                                            introduction does not automatically
                                            expose private biodata. Create a
                                            separate controlled share link when
                                            appropriate.
                                        </span>
                                    </div>
                                    <div className="setting-row">
                                        <div>
                                            <h3>Private file access</h3>
                                            <p>
                                                All profile photos and documents
                                                are stored outside the public
                                                website directory and checked on
                                                every request.
                                            </p>
                                        </div>
                                        <Badge>Always enabled</Badge>
                                    </div>
                                    <div className="setting-row">
                                        <div>
                                            <h3>Audit history</h3>
                                            <p>
                                                Profile views, changes, exports,
                                                and share-link actions are
                                                recorded.
                                            </p>
                                        </div>
                                        <Badge>Always enabled</Badge>
                                    </div>
                                </div>
                            </Card>
                        )}
                        {tab === "Matching preferences" && (
                            <Card
                                title="Explainable matching weights"
                                description="Set relative importance for recorded preferences. Missing values do not count as a match."
                            >
                                <div className="dialog-body stack">
                                    {[
                                        ["age", "Age"],
                                        ["city", "City"],
                                        ["education", "Education"],
                                        ["religion", "Religion"],
                                        ["marital_status", "Marital status"],
                                    ].map(([k, l]) => (
                                        <Field key={k} label={l}>
                                            <div className="weight-input">
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="100"
                                                    value={
                                                        form.settings.weights?.[
                                                            k
                                                        ] ?? 20
                                                    }
                                                    onChange={(e) =>
                                                        set("weights", {
                                                            ...form.settings
                                                                .weights,
                                                            [k]: Number(
                                                                e.target.value,
                                                            ),
                                                        })
                                                    }
                                                />
                                                <strong>
                                                    {form.settings.weights?.[
                                                        k
                                                    ] ?? 20}
                                                </strong>
                                            </div>
                                        </Field>
                                    ))}
                                </div>
                            </Card>
                        )}
                        {tab === "Message templates" && (
                            <Card
                                title="Your bureau’s message template"
                                description="A reusable message for family conversations. Copy and personalize it before sending."
                            >
                                <div className="dialog-body stack">
                                    <Field label="Message">
                                        <textarea
                                            rows={8}
                                            placeholder="Assalamualaikum. We have shortlisted a few profiles for your consideration. Please review the private link and share your thoughts."
                                            value={
                                                form.settings.templates || ""
                                            }
                                            onChange={(e) =>
                                                set("templates", e.target.value)
                                            }
                                        />
                                    </Field>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={async () => {
                                            try {
                                                await copy(
                                                    form.settings.templates ||
                                                        "",
                                                );
                                                toast("Template copied");
                                            } catch {
                                                toast(
                                                    "Select and copy the template manually",
                                                    true,
                                                );
                                            }
                                        }}
                                    >
                                        <Copy size={15} />
                                        Copy template
                                    </Button>
                                </div>
                            </Card>
                        )}
                        {owner && (
                            <div className="settings-save">
                                <Button type="submit" disabled={busy}>
                                    <Save size={16} />
                                    {busy ? "Saving…" : "Save changes"}
                                </Button>
                            </div>
                        )}
                    </fieldset>
                </form>
            </div>
        </>
    );
}
export function StaffPage() {
    const { data, owner, refresh } = useWorkspace(),
        toast = useToast();
    const [modal, setModal] = useState(false),
        [email, setEmail] = useState(""),
        [role, setRole] = useState("staff"),
        [url, setUrl] = useState(""),
        [error, setError] = useState(""),
        [busy, setBusy] = useState(false);
    const invite = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
            const res = await api("/staff/invite", "POST", { email, role });
            setUrl(res.url);
            toast("Invitation link created");
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };
    const change = async (s: any, updates: any) => {
        try {
            await api("/staff/" + s.id, "PUT", {
                role: s.role,
                active: Boolean(s.active),
                ...updates,
            });
            await refresh();
            toast("Staff access updated");
        } catch (e: any) {
            toast(e.message, true);
        }
    };
    return (
        <>
            <PageHeading
                title="Staff & roles"
                description="The right people, with the right level of access."
            >
                {owner && (
                    <Button
                        onClick={() => {
                            setModal(true);
                            setUrl("");
                            setError("");
                        }}
                    >
                        <Plus size={16} />
                        Invite staff
                    </Button>
                )}
            </PageHeading>
            <Card>
                <div className="table-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>Team member</th>
                                <th>Role</th>
                                <th>Assigned activities</th>
                                <th>Status</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {data.staff.map((s) => (
                                <tr key={s.id}>
                                    <td>
                                        <div className="person">
                                            <span className="avatar">
                                                {initials(s.name)}
                                            </span>
                                            <span>
                                                <strong>{s.name}</strong>
                                                <small>{s.email}</small>
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        {owner && s.role !== "owner" ? (
                                            <select
                                                aria-label={`Role for ${s.name}`}
                                                value={s.role}
                                                onChange={(e) =>
                                                    change(s, {
                                                        role: e.target.value,
                                                    })
                                                }
                                            >
                                                {[
                                                    "manager",
                                                    "staff",
                                                    "readonly",
                                                ].map((r) => (
                                                    <option key={r}>{r}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <Badge>{s.role}</Badge>
                                        )}
                                    </td>
                                    <td>
                                        {
                                            data.work.filter(
                                                (w) => w.assigned_to === s.id,
                                            ).length
                                        }
                                    </td>
                                    <td>
                                        <Badge>
                                            {s.active ? "Active" : "Disabled"}
                                        </Badge>
                                    </td>
                                    <td>
                                        {owner && s.role !== "owner" && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    change(s, {
                                                        active: !s.active,
                                                    })
                                                }
                                            >
                                                {s.active
                                                    ? "Disable access"
                                                    : "Enable access"}
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
            <div className="role-cards">
                {[
                    [
                        "Owner",
                        "Bureau settings, network decisions, exports, staff permissions, and all CRM records.",
                    ],
                    [
                        "Manager / Matchmaker",
                        "Create and manage profiles, proposals, follow-ups, meetings, and family links.",
                    ],
                    [
                        "Read-only",
                        "View bureau records and reports. Cannot edit, export, or create links.",
                    ],
                ].map(([r, t]) => (
                    <Card key={r} className="role-card">
                        <ShieldCheck size={20} />
                        <h3>{r}</h3>
                        <p>{t}</p>
                    </Card>
                ))}
            </div>
            <Modal
                open={modal}
                onClose={() => setModal(false)}
                title="Invite a team member"
                description="The invitation expires in three days. Share it directly with the intended colleague."
            >
                {url ? (
                    <div className="dialog-body stack">
                        <p>
                            Invitation for <strong>{email}</strong>
                        </p>
                        <input
                            aria-label="Staff invitation link"
                            readOnly
                            value={url}
                            onFocus={(e) => e.target.select()}
                        />
                        <Button
                            onClick={async () => {
                                try {
                                    await copy(url);
                                    toast("Invitation link copied");
                                } catch {
                                    toast(
                                        "Select and copy the link manually",
                                        true,
                                    );
                                }
                            }}
                        >
                            <Copy size={15} />
                            Copy invitation
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={invite}>
                        <div className="dialog-body stack">
                            <ErrorBox message={error} />
                            <Field label="Email address">
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </Field>
                            <Field label="Role">
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                >
                                    <option value="manager">Manager</option>
                                    <option value="staff">
                                        Matchmaker / Staff
                                    </option>
                                    <option value="readonly">Read-only</option>
                                </select>
                            </Field>
                        </div>
                        <div className="dialog-footer">
                            <span />
                            <Button disabled={busy}>
                                {busy ? "Creating…" : "Create invitation"}
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>
        </>
    );
}
export function NetworkPage() {
    const { data, go, owner, canWrite } = useWorkspace(),
        toast = useToast();
    const [network, setNetwork] = useState<any>(null),
        [error, setError] = useState(""),
        [target, setTarget] = useState<any>(null),
        [message, setMessage] = useState(""),
        [busy, setBusy] = useState(false);
    const load = () =>
        api("/network")
            .then(setNetwork)
            .catch((e) => setError(e.message));
    useEffect(() => {
        load();
    }, []);
    const send = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            await api("/introductions", "POST", {
                profile_id: target.id,
                message,
            });
            setTarget(null);
            await load();
            toast("Introduction requested");
        } catch (e: any) {
            toast(e.message, true);
        } finally {
            setBusy(false);
        }
    };
    const respond = async (id: number, status: string) => {
        try {
            await api("/introductions/" + id, "PUT", { status });
            await load();
            toast("Introduction " + status.toLowerCase());
        } catch (e: any) {
            toast(e.message, true);
        }
    };
    return (
        <>
            <PageHeading
                eyebrow="Better, together"
                title="Bureau network"
                description="Discover possibilities beyond your directory, without exposing private biodata."
            />
            <ErrorBox message={error} />
            {!network ? (
                <Loading />
            ) : !network.enabled ? (
                <Card>
                    <Empty
                        title="Your bureau is private by default"
                        text="Opt in to discover anonymous availability from other participating bureaus. Names, contact details, and photos are never listed."
                        action={
                            owner && (
                                <Button onClick={() => go("settings")}>
                                    Manage network privacy
                                    <ArrowUpRight size={15} />
                                </Button>
                            )
                        }
                    />
                </Card>
            ) : (
                <>
                    <div className="notice">
                        <ShieldCheck size={20} />
                        <span>
                            Only approximate age, city, gender, and a reference
                            ID are visible. An accepted introduction requires a
                            separate, deliberate sharing step.
                        </span>
                    </div>
                    <div className="network-grid">
                        {network.listings.map((p: any) => (
                            <Card key={p.id} className="network-card">
                                <span className="square-icon">
                                    <Building2 size={22} />
                                </span>
                                <h3>{p.bureau}</h3>
                                <p>
                                    {pid(p.id)} ·{" "}
                                    {p.gender === "Female" ? "Bride" : "Groom"}
                                </p>
                                <div className="network-info">
                                    <span>
                                        <MapPin size={15} />
                                        {p.city}
                                    </span>
                                    <span>
                                        Age {p.age_band || "not specified"}
                                    </span>
                                </div>
                                {canWrite && (
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setTarget(p);
                                            setMessage("");
                                        }}
                                    >
                                        Request introduction
                                        <ArrowUpRight size={15} />
                                    </Button>
                                )}
                            </Card>
                        ))}
                    </div>
                    {!network.listings.length && (
                        <Card>
                            <Empty
                                title="No network listings yet"
                                text="Profiles appear when other bureaus opt in to network discovery."
                            />
                        </Card>
                    )}
                </>
            )}
            {network?.requests?.length > 0 && (
                <Card
                    title="Introduction requests"
                    description="Incoming and outgoing conversations."
                    className="mt-20"
                >
                    {network.requests.map((r: any) => (
                        <div className="request-row" key={r.id}>
                            <div>
                                <strong>
                                    {r.target_bureau_id === data.bureau.id
                                        ? "From " + r.from_bureau
                                        : "To " + r.to_bureau}
                                </strong>
                                <small>
                                    {pid(r.profile_id)} · {date(r.created_at)}
                                </small>
                                <p>{r.message}</p>
                                {r.status === "Accepted" && (
                                    <small>
                                        Introduction accepted. Coordinate a
                                        consented, private share link with the
                                        other bureau.
                                    </small>
                                )}
                            </div>
                            <Badge>{r.status}</Badge>
                            {r.target_bureau_id === data.bureau.id &&
                                r.status === "Pending" &&
                                owner && (
                                    <div className="toolbar">
                                        <Button
                                            size="sm"
                                            onClick={() =>
                                                respond(r.id, "Accepted")
                                            }
                                        >
                                            Accept
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                respond(r.id, "Rejected")
                                            }
                                        >
                                            Decline
                                        </Button>
                                    </div>
                                )}
                        </div>
                    ))}
                </Card>
            )}
            <Modal
                open={!!target}
                onClose={() => setTarget(null)}
                title="Request an introduction"
                description="Send a short message to the owning bureau. Do not include private family information."
            >
                <form onSubmit={send}>
                    <div className="dialog-body">
                        <Field label="Message">
                            <textarea
                                required
                                rows={5}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="We may have a compatible profile. Could we discuss an introduction?"
                            />
                        </Field>
                    </div>
                    <div className="dialog-footer">
                        <span />
                        <Button disabled={busy}>
                            {busy ? "Sending…" : "Send request"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
