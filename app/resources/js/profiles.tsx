import { useEffect, useState } from "react";
import {
    Plus,
    Search,
    SlidersHorizontal,
    LayoutGrid,
    List,
    ArrowUpRight,
    MapPin,
    Briefcase,
    GraduationCap,
    Heart,
    ArrowLeft,
    Edit3,
    Share2,
    Archive,
    FileText,
    Upload,
    Check,
    Copy,
    RefreshCw,
    Sparkles,
    CheckCircle2,
    Minus,
    ShieldCheck,
    X,
    Bookmark,
    ChevronLeft,
    ChevronRight,
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
import { api, age, date, initials, pid, copy } from "./lib";
import type { Profile, Match } from "./types";
const statuses = ["Draft", "Pending Review", "Active", "On Hold", "Matched"];
const maritals = ["Never married", "Divorced", "Widowed", "Separated"];
export function Profiles() {
    const { data, go, open, canWrite, refresh } = useWorkspace(),
        toast = useToast();
    const [tab, setTab] = useState("All profiles"),
        [q, setQ] = useState(""),
        [status, setStatus] = useState(""),
        [city, setCity] = useState(""),
        [view, setView] = useState("table"),
        [page, setPage] = useState(1),
        [filters, setFilters] = useState(false),
        [selected, setSelected] = useState<number[]>([]),
        [confirm, setConfirm] = useState(false),
        [busy, setBusy] = useState(false);
    const filtered = data.profiles.filter(
        (p) =>
            (tab === "All profiles" ||
                p.gender === (tab === "Brides" ? "Female" : "Male")) &&
            (!status || p.status === status) &&
            (!city || p.city === city) &&
            `${p.name} ${p.city} ${p.profession} ${pid(p.id)}`
                .toLowerCase()
                .includes(q.toLowerCase()),
    );
    useEffect(() => setPage(1), [tab, q, status, city]);
    const rows = filtered.slice((page - 1) * 10, page * 10);
    const restore = async (id: number) => {
        try {
            await api(`/profiles/${id}/restore`, "POST");
            await refresh();
            toast("Profile restored");
        } catch (e: any) {
            toast(e.message, true);
        }
    };
    const bulkArchive = async () => {
        setBusy(true);
        try {
            for (const id of selected) await api("/profiles/" + id, "DELETE");
            setSelected([]);
            setConfirm(false);
            await refresh();
            toast("Selected profiles archived");
        } catch (e: any) {
            toast(e.message, true);
        } finally {
            setBusy(false);
        }
    };
    const saveFilters = () => {
        localStorage.setItem(
            `rh-filters-${data.bureau.id}`,
            JSON.stringify({ tab, status, city }),
        );
        toast("Filters saved on this device");
    };
    const loadFilters = () => {
        try {
            const v = JSON.parse(
                localStorage.getItem(`rh-filters-${data.bureau.id}`) || "null",
            );
            if (v) {
                setTab(v.tab);
                setStatus(v.status);
                setCity(v.city);
            } else toast("No saved filters yet");
        } catch {
            toast("Saved filters could not be loaded", true);
        }
    };
    return (
        <>
            <PageHeading
                eyebrow="Your private directory"
                title="Profiles"
                description="Every profile is a person. Keep their story organized."
            >
                <Button
                    variant="outline"
                    onClick={() =>
                        setTab(tab === "Archived" ? "All profiles" : "Archived")
                    }
                >
                    <Archive size={16} />
                    Archived ({data.archived.length})
                </Button>
                {canWrite && (
                    <Button onClick={() => open("profile")}>
                        <Plus size={17} />
                        Add profile
                    </Button>
                )}
            </PageHeading>
            <div className="tabs-line">
                {["All profiles", "Brides", "Grooms"].map((t) => (
                    <button
                        key={t}
                        className={tab === t ? "active" : ""}
                        onClick={() => setTab(t)}
                    >
                        {t}
                        <span>
                            {t === "All profiles"
                                ? data.profiles.length
                                : data.profiles.filter(
                                      (p) =>
                                          p.gender ===
                                          (t === "Brides" ? "Female" : "Male"),
                                  ).length}
                        </span>
                    </button>
                ))}
            </div>
            {tab === "Archived" ? (
                <Card
                    title="Archived profiles"
                    description="Restore profiles here. Previously revoked share links stay revoked."
                >
                    {data.archived.map((p) => (
                        <div className="simple-row" key={p.id}>
                            <span>
                                {p.name}
                                <small>{p.city}</small>
                            </span>
                            {canWrite && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => restore(p.id)}
                                >
                                    <RefreshCw size={14} />
                                    Restore
                                </Button>
                            )}
                        </div>
                    ))}
                    {!data.archived.length && (
                        <Empty title="No archived profiles" />
                    )}
                </Card>
            ) : (
                <>
                    <div className="toolbar">
                        <div className="search-field">
                            <Search size={17} />
                            <input
                                aria-label="Search profiles"
                                placeholder="Search by name, ID, city, profession…"
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                            />
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => setFilters(!filters)}
                        >
                            <SlidersHorizontal size={16} />
                            Filters
                            {status || city ? (
                                <span className="filter-dot" />
                            ) : null}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Load saved filters"
                            onClick={loadFilters}
                        >
                            <Bookmark size={17} />
                        </Button>
                        <div className="segmented">
                            <button
                                aria-label="Table view"
                                className={view === "table" ? "active" : ""}
                                onClick={() => setView("table")}
                            >
                                <List size={17} />
                            </button>
                            <button
                                aria-label="Grid view"
                                className={view === "grid" ? "active" : ""}
                                onClick={() => setView("grid")}
                            >
                                <LayoutGrid size={17} />
                            </button>
                        </div>
                    </div>
                    {filters && (
                        <div className="filters">
                            <Field label="Status">
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                >
                                    <option value="">All statuses</option>
                                    {statuses.map((s) => (
                                        <option key={s}>{s}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="City">
                                <select
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                >
                                    <option value="">All cities</option>
                                    {[
                                        ...new Set(
                                            data.profiles.map((p) => p.city),
                                        ),
                                    ]
                                        .sort()
                                        .map((c) => (
                                            <option key={c}>{c}</option>
                                        ))}
                                </select>
                            </Field>
                            <Button variant="outline" onClick={saveFilters}>
                                Save filters
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setStatus("");
                                    setCity("");
                                    setQ("");
                                }}
                            >
                                Reset
                            </Button>
                        </div>
                    )}
                    {!!selected.length && (
                        <div className="selection-bar">
                            <span>{selected.length} profiles selected</span>
                            <Button
                                size="sm"
                                variant="danger"
                                onClick={() => setConfirm(true)}
                            >
                                Archive selected
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelected([])}
                            >
                                Clear
                            </Button>
                        </div>
                    )}
                    {!filtered.length ? (
                        <Card>
                            <Empty
                                title="No profiles found"
                                text="Try a different search or add your first profile."
                            />
                        </Card>
                    ) : view === "table" ? (
                        <Card>
                            <div className="table-scroll">
                                <table className="profile-table">
                                    <thead>
                                        <tr>
                                            {canWrite && (
                                                <th>
                                                    <input
                                                        type="checkbox"
                                                        aria-label="Select visible profiles"
                                                        checked={
                                                            rows.length > 0 &&
                                                            rows.every((p) =>
                                                                selected.includes(
                                                                    p.id,
                                                                ),
                                                            )
                                                        }
                                                        onChange={(e) =>
                                                            setSelected(
                                                                e.target.checked
                                                                    ? [
                                                                          ...new Set(
                                                                              [
                                                                                  ...selected,
                                                                                  ...rows.map(
                                                                                      (
                                                                                          p,
                                                                                      ) =>
                                                                                          p.id,
                                                                                  ),
                                                                              ],
                                                                          ),
                                                                      ]
                                                                    : selected.filter(
                                                                          (
                                                                              id,
                                                                          ) =>
                                                                              !rows.some(
                                                                                  (
                                                                                      p,
                                                                                  ) =>
                                                                                      p.id ===
                                                                                      id,
                                                                              ),
                                                                      ),
                                                            )
                                                        }
                                                    />
                                                </th>
                                            )}
                                            <th>Profile</th>
                                            <th>Age / Gender</th>
                                            <th>Location</th>
                                            <th>Education</th>
                                            <th>Status</th>
                                            <th>Added</th>
                                            <th />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((p) => (
                                            <tr key={p.id}>
                                                {canWrite && (
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            aria-label={`Select ${p.name}`}
                                                            checked={selected.includes(
                                                                p.id,
                                                            )}
                                                            onChange={(e) =>
                                                                setSelected(
                                                                    e.target
                                                                        .checked
                                                                        ? [
                                                                              ...selected,
                                                                              p.id,
                                                                          ]
                                                                        : selected.filter(
                                                                              (
                                                                                  id,
                                                                              ) =>
                                                                                  id !==
                                                                                  p.id,
                                                                          ),
                                                                )
                                                            }
                                                        />
                                                    </td>
                                                )}
                                                <td>
                                                    <button
                                                        className="person"
                                                        onClick={() =>
                                                            go(
                                                                "profiles/" +
                                                                    p.id,
                                                            )
                                                        }
                                                    >
                                                        <span
                                                            className={
                                                                "avatar avatar-" +
                                                                (p.gender ===
                                                                "Female"
                                                                    ? "rose"
                                                                    : "sage")
                                                            }
                                                        >
                                                            {initials(p.name)}
                                                        </span>
                                                        <span>
                                                            <strong>
                                                                {p.name}
                                                            </strong>
                                                            <small>
                                                                {pid(p.id)} ·{" "}
                                                                {p.profession}
                                                            </small>
                                                        </span>
                                                    </button>
                                                </td>
                                                <td>
                                                    {age(p.dob)} yrs{" "}
                                                    <small>
                                                        {p.gender === "Female"
                                                            ? "Bride"
                                                            : "Groom"}
                                                    </small>
                                                </td>
                                                <td>
                                                    {p.city}
                                                    <small>{p.country}</small>
                                                </td>
                                                <td>{p.education || "—"}</td>
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
                                                        aria-label={`Open ${p.name}`}
                                                        onClick={() =>
                                                            go(
                                                                "profiles/" +
                                                                    p.id,
                                                            )
                                                        }
                                                    >
                                                        <ArrowUpRight
                                                            size={16}
                                                        />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    ) : (
                        <div className="profile-grid">
                            {rows.map((p) => (
                                <Card key={p.id} className="profile-card">
                                    <div className="profile-card-top">
                                        <span
                                            className={
                                                "avatar large-avatar avatar-" +
                                                (p.gender === "Female"
                                                    ? "rose"
                                                    : "sage")
                                            }
                                        >
                                            {initials(p.name)}
                                        </span>
                                        <Badge>{p.status}</Badge>
                                    </div>
                                    <h3>{p.name}</h3>
                                    <p>
                                        {age(p.dob)} years · {p.marital_status}
                                    </p>
                                    <div className="profile-meta">
                                        <span>
                                            <MapPin size={15} />
                                            {p.city}, {p.country}
                                        </span>
                                        <span>
                                            <Briefcase size={15} />
                                            {p.profession || "Not specified"}
                                        </span>
                                        <span>
                                            <GraduationCap size={15} />
                                            {p.education || "Not specified"}
                                        </span>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={() => go("profiles/" + p.id)}
                                    >
                                        View profile
                                        <ArrowUpRight size={15} />
                                    </Button>
                                </Card>
                            ))}
                        </div>
                    )}
                    <div className="pagination">
                        <span>
                            Showing {filtered.length ? (page - 1) * 10 + 1 : 0}–
                            {Math.min(page * 10, filtered.length)} of{" "}
                            {filtered.length} profiles
                        </span>
                        <div>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page === 1}
                                onClick={() => setPage(page - 1)}
                            >
                                <ChevronLeft size={15} />
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page * 10 >= filtered.length}
                                onClick={() => setPage(page + 1)}
                            >
                                Next
                                <ChevronRight size={15} />
                            </Button>
                        </div>
                    </div>
                </>
            )}
            <Modal
                open={confirm}
                onClose={() => setConfirm(false)}
                title="Archive selected profiles?"
                description="These records can be restored. Their active share links will be revoked."
            >
                <div className="dialog-body">
                    <Button
                        variant="danger"
                        disabled={busy}
                        onClick={bulkArchive}
                    >
                        {busy
                            ? "Archiving…"
                            : "Archive " + selected.length + " profiles"}
                    </Button>
                </div>
            </Modal>
        </>
    );
}
export function ProfileEditor({
    initial,
    onDone,
}: {
    initial?: Partial<Profile>;
    onDone: () => void;
}) {
    const { refresh } = useWorkspace(),
        toast = useToast();
    const [form, setForm] = useState<any>({
            name: "",
            gender: "Female",
            dob: "",
            city: "",
            country: "Pakistan",
            profession: "",
            education: "",
            status: "Active",
            marital_status: "Never married",
            religion: "",
            sect: "",
            phone: "",
            notes: "",
            tags: [],
            details: {},
            preferences: { age_min: 24, age_max: 35 },
            ...initial,
            consent: !!initial?.consented_at,
        }),
        [section, setSection] = useState("Basics"),
        [busy, setBusy] = useState(false),
        [error, setError] = useState(""),
        [raw, setRaw] = useState(""),
        [importing, setImporting] = useState(false),
        [useAI, setUseAI] = useState(false),
        [tagsText, setTagsText] = useState(initial?.tags?.join(", ") || "");
    const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
    const nested = (group: string, k: string, v: any) =>
        setForm((f: any) => ({ ...f, [group]: { ...f[group], [k]: v } }));
    const input = (
        label: string,
        key: string,
        type = "text",
        group?: string,
        required = false,
    ) => (
        <Field label={label} key={key}>
            <input
                type={type}
                required={required}
                value={(group ? form[group]?.[key] : form[key]) ?? ""}
                onChange={(e) =>
                    group
                        ? nested(group, key, e.target.value)
                        : set(key, e.target.value)
                }
            />
        </Field>
    );
    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        try {
            const res = await api(
                "/profiles" + (initial?.id ? "/" + initial.id : ""),
                initial?.id ? "PUT" : "POST",
                {
                    ...form,
                    tags: tagsText
                        .split(",")
                        .map((x) => x.trim())
                        .filter(Boolean),
                },
            );
            await refresh();
            toast(
                res.duplicates?.length
                    ? "Profile saved. Possible duplicate: " +
                          res.duplicates.map((p: any) => p.name).join(", ")
                    : "Profile saved successfully",
            );
            onDone();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };
    const extract = async () => {
        setImporting(true);
        setError("");
        try {
            const res = await api("/import", "POST", {
                text: raw,
                use_ai: useAI,
            });
            setForm((f: any) => ({ ...f, ...res.fields }));
            toast(res.notice);
            setSection("Basics");
        } catch (e: any) {
            setError(e.message);
        } finally {
            setImporting(false);
        }
    };
    return (
        <form onSubmit={submit}>
            <div className="form-tabs">
                {[
                    "Basics",
                    "Family & lifestyle",
                    "Preferences",
                    "Notes & consent",
                    "Import biodata",
                ].map((s) => (
                    <button
                        type="button"
                        key={s}
                        onClick={() => setSection(s)}
                        className={section === s ? "active" : ""}
                    >
                        {s}
                    </button>
                ))}
            </div>
            <div className="dialog-body">
                <ErrorBox message={error} />
                {section === "Basics" && (
                    <div className="form-grid">
                        {input("Full name *", "name")}
                        <Field label="Profile for">
                            <select
                                value={form.gender}
                                onChange={(e) => set("gender", e.target.value)}
                            >
                                <option value="Female">Bride</option>
                                <option value="Male">Groom</option>
                            </select>
                        </Field>
                        {input("Date of birth * (18+)", "dob", "date")}
                        {input("City *", "city")}
                        {input("Country *", "country")}
                        {input("Profession", "profession")}
                        {input("Education", "education")}
                        <Field label="Marital status">
                            <select
                                value={form.marital_status}
                                onChange={(e) =>
                                    set("marital_status", e.target.value)
                                }
                            >
                                {maritals.map((s) => (
                                    <option key={s}>{s}</option>
                                ))}
                            </select>
                        </Field>
                        {input("Religion", "religion")}
                        {input("Sect", "sect")}
                        {input("Phone (private by default)", "phone", "tel")}
                        <Field label="Profile status">
                            <select
                                value={form.status}
                                onChange={(e) => set("status", e.target.value)}
                            >
                                {statuses.map((s) => (
                                    <option key={s}>{s}</option>
                                ))}
                            </select>
                        </Field>
                        {input("Height", "height", "text", "details")}
                        {input("Income range", "income", "text", "details")}
                    </div>
                )}
                {section === "Family & lifestyle" && (
                    <div className="form-grid">
                        {[
                            ["Father", "father"],
                            ["Mother", "mother"],
                            ["Siblings", "siblings"],
                            ["Family city", "family_city"],
                            ["Language", "language"],
                            ["Community", "community"],
                            ["Nationality", "nationality"],
                            ["Weight", "weight"],
                        ].map(([l, k]) => input(l, k, "text", "details"))}
                        <Field label="Family background">
                            <textarea
                                value={form.details?.family_background || ""}
                                onChange={(e) =>
                                    nested(
                                        "details",
                                        "family_background",
                                        e.target.value,
                                    )
                                }
                            />
                        </Field>
                        <Field label="Lifestyle">
                            <textarea
                                value={form.details?.lifestyle || ""}
                                onChange={(e) =>
                                    nested(
                                        "details",
                                        "lifestyle",
                                        e.target.value,
                                    )
                                }
                            />
                        </Field>
                    </div>
                )}
                {section === "Preferences" && (
                    <>
                        <p className="form-explainer">
                            Preferences guide suggestions. Leave a field blank
                            when there is no preference.
                        </p>
                        <div className="form-grid">
                            {input(
                                "Minimum age",
                                "age_min",
                                "number",
                                "preferences",
                            )}
                            {input(
                                "Maximum age",
                                "age_max",
                                "number",
                                "preferences",
                            )}
                            {input(
                                "Preferred city",
                                "city",
                                "text",
                                "preferences",
                            )}
                            {input(
                                "Education",
                                "education",
                                "text",
                                "preferences",
                            )}
                            {input(
                                "Religion",
                                "religion",
                                "text",
                                "preferences",
                            )}
                            <Field label="Marital status">
                                <select
                                    value={
                                        form.preferences?.marital_status || ""
                                    }
                                    onChange={(e) =>
                                        nested(
                                            "preferences",
                                            "marital_status",
                                            e.target.value,
                                        )
                                    }
                                >
                                    <option value="">No preference</option>
                                    {maritals.map((s) => (
                                        <option key={s}>{s}</option>
                                    ))}
                                </select>
                            </Field>
                        </div>
                    </>
                )}
                {section === "Notes & consent" && (
                    <div className="stack">
                        <Field label="Internal notes — never included in shared profiles">
                            <textarea
                                rows={5}
                                value={form.notes || ""}
                                onChange={(e) => set("notes", e.target.value)}
                            />
                        </Field>
                        <Field label="Tags (comma separated)">
                            <input
                                value={tagsText}
                                onChange={(e) => setTagsText(e.target.value)}
                            />
                        </Field>
                        <label className="checkbox-row">
                            <input
                                type="checkbox"
                                checked={form.consent}
                                onChange={(e) =>
                                    set("consent", e.target.checked)
                                }
                            />
                            <span>
                                I have the person’s permission to store their
                                biodata and use it for bureau matchmaking.
                                Consent is recorded with a timestamp.
                            </span>
                        </label>
                    </div>
                )}
                {section === "Import biodata" && (
                    <div className="stack">
                        <div className="notice">
                            <Sparkles size={18} />
                            <span>
                                Paste biodata to prepare a draft. Always review
                                extracted fields before saving.
                            </span>
                        </div>
                        <Field label="WhatsApp biodata">
                            <textarea
                                rows={10}
                                placeholder={
                                    "Name: Ayesha Khan\nCity: Lahore\nEducation: MBA\nProfession: Product Designer"
                                }
                                value={raw}
                                onChange={(e) => setRaw(e.target.value)}
                            />
                        </Field>
                        <label className="checkbox-row">
                            <input
                                type="checkbox"
                                checked={useAI}
                                onChange={(e) => setUseAI(e.target.checked)}
                            />
                            Use the configured AI provider (sends this text
                            externally). Otherwise, extract labelled text
                            locally.
                        </label>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={importing || !raw.trim()}
                            onClick={extract}
                        >
                            <Sparkles size={16} />
                            {importing ? "Extracting…" : "Extract biodata"}
                        </Button>
                    </div>
                )}
            </div>
            <div className="dialog-footer">
                <span className="muted">
                    <ShieldCheck size={14} />
                    Private to your bureau
                </span>
                <div>
                    <Button type="button" variant="outline" onClick={onDone}>
                        Cancel
                    </Button>
                    <Button disabled={busy} type="submit">
                        {busy ? "Saving…" : "Save profile"}
                    </Button>
                </div>
            </div>
        </form>
    );
}
export function ProfileDetail({ id }: { id: number }) {
    const { data, go, open, canWrite, refresh } = useWorkspace(),
        toast = useToast();
    const [p, setP] = useState<Profile | null>(null),
        [error, setError] = useState(""),
        [tab, setTab] = useState("Overview"),
        [archive, setArchive] = useState(false),
        [uploading, setUploading] = useState(false);
    const load = () =>
        api<Profile>("/profiles/" + id)
            .then(setP)
            .catch((e) => setError(e.message));
    useEffect(() => {
        setP(null);
        setError("");
        load();
    }, [id, data.profiles]);
    if (error) return <ErrorBox message={error} />;
    if (!p) return <Loading />;
    const archiveProfile = async () => {
        try {
            await api("/profiles/" + id, "DELETE");
            await refresh();
            toast("Profile archived and links revoked");
            go("profiles");
        } catch (e: any) {
            toast(e.message, true);
        }
    };
    const upload = async (file: File | undefined, kind: string) => {
        if (!file) return;
        setUploading(true);
        try {
            const body = new FormData();
            body.append("file", file);
            body.append("kind", kind);
            await api("/profiles/" + id + "/files", "POST", body);
            await load();
            toast("File uploaded privately");
        } catch (e: any) {
            toast(e.message, true);
        } finally {
            setUploading(false);
        }
    };
    const review = async (eid: number, accept: boolean) => {
        try {
            await api("/edits/" + eid, "POST", { accept });
            await refresh();
            await load();
            toast("Corrections " + (accept ? "accepted" : "declined"));
        } catch (e: any) {
            toast(e.message, true);
        }
    };
    const completeness = Math.round(
        [
            p.name,
            p.dob,
            p.city,
            p.profession,
            p.education,
            p.phone,
            p.details?.father,
            p.details?.mother,
            p.preferences?.age_min,
            p.consented_at,
        ].filter(Boolean).length * 10,
    );
    return (
        <>
            <button className="back-link" onClick={() => go("profiles")}>
                <ArrowLeft size={15} />
                Back to profiles
            </button>
            <PageHeading
                title={p.name}
                description={`${pid(p.id)} · Added ${date(p.created_at)} · Updated ${date(p.updated_at || p.created_at)}`}
            >
                <Badge>{p.status}</Badge>
                {canWrite && (
                    <>
                        <Button
                            variant="outline"
                            onClick={() => open("profile", p)}
                        >
                            <Edit3 size={15} />
                            Edit profile
                        </Button>
                        <Button
                            onClick={() =>
                                open("share", { kind: "edit", profile_id: id })
                            }
                        >
                            <Share2 size={15} />
                            Family update link
                        </Button>
                    </>
                )}
            </PageHeading>
            {data.edits
                .filter((e) => e.profile_id === id)
                .map((e) => (
                    <div className="review-banner" key={e.id}>
                        <div>
                            <strong>Family corrections awaiting review</strong>
                            <p>
                                {Object.entries(JSON.parse(e.data))
                                    .map(([k, v]) => `${k}: ${v}`)
                                    .join(" · ")}
                            </p>
                        </div>
                        {canWrite && (
                            <>
                                <Button
                                    size="sm"
                                    onClick={() => review(e.id, true)}
                                >
                                    Accept changes
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => review(e.id, false)}
                                >
                                    Decline
                                </Button>
                            </>
                        )}
                    </div>
                ))}
            <div className="detail-layout">
                <div>
                    <Card className="biodata-card">
                        <span
                            className={
                                "avatar hero-avatar avatar-" +
                                (p.gender === "Female" ? "rose" : "sage")
                            }
                        >
                            {initials(p.name)}
                        </span>
                        <h2>{p.name}</h2>
                        <p>
                            {age(p.dob)} years ·{" "}
                            {p.gender === "Female" ? "Bride" : "Groom"}
                        </p>
                        <div className="profile-meta">
                            <span>
                                <MapPin size={16} />
                                {p.city}, {p.country}
                            </span>
                            <span>
                                <Briefcase size={16} />
                                {p.profession || "Not specified"}
                            </span>
                            <span>
                                <GraduationCap size={16} />
                                {p.education || "Not specified"}
                            </span>
                        </div>
                        <div className="completeness">
                            <div>
                                <span>Profile completeness</span>
                                <strong>{completeness}%</strong>
                            </div>
                            <div className="progress-track">
                                <span style={{ width: completeness + "%" }} />
                            </div>
                        </div>
                        <div className="tag-list">
                            {p.tags?.map((t) => (
                                <span key={t}>{t}</span>
                            ))}
                        </div>
                        <Button
                            onClick={() => go("matching?profile=" + id)}
                            variant="outline"
                        >
                            <Heart size={16} />
                            Find matches
                        </Button>
                        {canWrite && (
                            <Button
                                variant="ghost"
                                onClick={() =>
                                    open("proposal", { profile_id: id })
                                }
                            >
                                <SendIcon />
                                Create proposal
                            </Button>
                        )}
                    </Card>
                    <div className="secure-note">
                        <ShieldCheck size={16} />
                        <span>
                            Consent recorded {date(p.consented_at || "")}.
                            Contact details stay private unless explicitly
                            shared.
                        </span>
                    </div>
                </div>
                <div>
                    <div className="tabs-line">
                        {[
                            "Overview",
                            "Family",
                            "Preferences",
                            "Documents",
                            "Notes",
                            "Activity",
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
                    {tab === "Overview" && (
                        <Card title="Personal information">
                            <div className="biodata-grid">
                                {[
                                    ["Full name", p.name],
                                    ["Date of birth", p.dob?.slice(0, 10)],
                                    ["Marital status", p.marital_status],
                                    ["Religion", p.religion],
                                    ["Sect", p.sect],
                                    ["Phone (private)", p.phone],
                                    ["Height", p.details?.height],
                                    ["Income range", p.details?.income],
                                    ["Language", p.details?.language],
                                    ["Community", p.details?.community],
                                ].map(([l, v]) => (
                                    <div key={l}>
                                        <small>{l}</small>
                                        <strong>{v || "Not specified"}</strong>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                    {tab === "Family" && (
                        <Card title="Family background">
                            <div className="biodata-grid">
                                {[
                                    "father",
                                    "mother",
                                    "siblings",
                                    "family_city",
                                    "family_background",
                                    "lifestyle",
                                ].map((k) => (
                                    <div key={k}>
                                        <small>{k.replaceAll("_", " ")}</small>
                                        <strong>
                                            {p.details?.[k] || "Not specified"}
                                        </strong>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                    {tab === "Preferences" && (
                        <Card title="Partner preferences">
                            <div className="biodata-grid">
                                {Object.entries(p.preferences || {}).map(
                                    ([k, v]) => (
                                        <div key={k}>
                                            <small>
                                                {k.replaceAll("_", " ")}
                                            </small>
                                            <strong>
                                                {v || "No preference"}
                                            </strong>
                                        </div>
                                    ),
                                )}
                            </div>
                        </Card>
                    )}
                    {tab === "Notes" && (
                        <Card
                            title="Internal notes"
                            description="These notes are never shown in family links."
                        >
                            <p className="notes-body">
                                {p.notes || "No internal notes yet."}
                            </p>
                        </Card>
                    )}
                    {tab === "Documents" && (
                        <Card
                            title="Private photos & documents"
                            description="JPG, PNG, WebP or PDF · Up to 5 MB each"
                        >
                            <div className="dialog-body">
                                {canWrite && (
                                    <div className="upload-actions">
                                        {["photo", "document"].map((kind) => (
                                            <label
                                                className="btn btn-outline"
                                                key={kind}
                                            >
                                                <Upload size={15} />
                                                {uploading
                                                    ? "Uploading…"
                                                    : "Upload " + kind}
                                                <input
                                                    type="file"
                                                    hidden
                                                    accept={
                                                        kind === "photo"
                                                            ? "image/jpeg,image/png,image/webp"
                                                            : ".pdf,.jpg,.jpeg,.png,.webp"
                                                    }
                                                    disabled={uploading}
                                                    onChange={(e) =>
                                                        upload(
                                                            e.target.files?.[0],
                                                            kind,
                                                        )
                                                    }
                                                />
                                            </label>
                                        ))}
                                    </div>
                                )}
                                <div className="file-grid">
                                    {p.files?.map((f) => (
                                        <a
                                            key={f.id}
                                            href={"/api/files/" + f.id}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="file-card"
                                        >
                                            {f.kind === "photo" ? (
                                                <img
                                                    src={"/api/files/" + f.id}
                                                    alt={f.name}
                                                />
                                            ) : (
                                                <FileText size={30} />
                                            )}
                                            <span>{f.name}</span>
                                            <small>{f.kind}</small>
                                        </a>
                                    ))}
                                </div>
                                {!p.files?.length && (
                                    <Empty
                                        title="No files uploaded"
                                        text="Files are accessible only through permission-checked requests."
                                    />
                                )}
                            </div>
                        </Card>
                    )}
                    {tab === "Activity" && (
                        <Card title="Profile history">
                            {data.activities
                                .filter((a) => a.profile_id === id)
                                .map((a) => (
                                    <div className="simple-row" key={a.id}>
                                        <span>{a.description}</span>
                                        <small>
                                            {date(a.created_at, true)}
                                        </small>
                                    </div>
                                ))}
                        </Card>
                    )}
                    <Card
                        title="Shared access"
                        description="Revoke links instantly when access is no longer needed."
                        className="mt-20"
                    >
                        {p.links?.map((l) => (
                            <div className="simple-row" key={l.id}>
                                <span>
                                    Family update link{" "}
                                    <small>
                                        {l.views} views · Expires{" "}
                                        {date(l.expires_at)}
                                    </small>
                                </span>
                                {l.revoked_at ? (
                                    <Badge>Revoked</Badge>
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
                                                    await load();
                                                    toast("Link revoked");
                                                } catch (e: any) {
                                                    toast(e.message, true);
                                                }
                                            }}
                                        >
                                            Revoke
                                        </Button>
                                    )
                                )}
                            </div>
                        ))}
                        {!p.links?.length && (
                            <p className="notes-body muted">
                                No family update links created.
                            </p>
                        )}
                    </Card>
                    {canWrite && (
                        <div className="detail-bottom-actions">
                            <Button
                                variant="outline"
                                onClick={async () => {
                                    try {
                                        await copy(
                                            `Profile ${pid(p.id)}: ${age(p.dob)} years, ${p.city}. ${p.education || ""} · ${p.profession || ""}. Please contact our bureau for a private introduction.`,
                                        );
                                        toast("WhatsApp message copied");
                                    } catch {
                                        toast(
                                            "Clipboard unavailable. Please use your browser’s copy option.",
                                            true,
                                        );
                                    }
                                }}
                            >
                                <Copy size={15} />
                                Copy WhatsApp summary
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setArchive(true)}
                            >
                                <Archive size={15} />
                                Archive profile
                            </Button>
                        </div>
                    )}
                </div>
            </div>
            <Modal
                open={archive}
                onClose={() => setArchive(false)}
                title="Archive this profile?"
                description="This can be undone. Any active family links involving this profile will be revoked."
            >
                <div className="dialog-body">
                    <Button variant="danger" onClick={archiveProfile}>
                        Archive profile
                    </Button>
                </div>
            </Modal>
        </>
    );
}
function SendIcon() {
    return <Share2 size={16} />;
}
export function Matching() {
    const { data, open, canWrite } = useWorkspace(),
        toast = useToast();
    const initialId = new URLSearchParams(location.search).get("profile");
    const [id, setId] = useState(
            initialId || String(data.profiles[0]?.id || ""),
        ),
        [matches, setMatches] = useState<Match[]>([]),
        [busy, setBusy] = useState(false),
        [error, setError] = useState(""),
        [compare, setCompare] = useState<Profile | null>(null),
        [shortOnly, setShortOnly] = useState(false);
    const source = data.profiles.find((p) => p.id === Number(id));
    const load = () => {
        if (!id) return;
        setBusy(true);
        api<Match[]>("/profiles/" + id + "/matches")
            .then(setMatches)
            .catch((e) => setError(e.message))
            .finally(() => setBusy(false));
    };
    useEffect(load, [id]);
    const decide = async (candidate: number, decision: string) => {
        try {
            await api("/profiles/" + id + "/decision", "POST", {
                candidate_id: candidate,
                decision,
            });
            load();
            toast("Match " + decision.toLowerCase());
        } catch (e: any) {
            toast(e.message, true);
        }
    };
    return (
        <>
            <PageHeading
                eyebrow="Thoughtful suggestions"
                title="Smart matching"
                description="Find compatibility you can explain. Make the final decision yourself."
            />
            <Card className="match-selector">
                <Field label="Find matches for">
                    <select
                        value={id}
                        onChange={(e) => {
                            setId(e.target.value);
                            setError("");
                        }}
                    >
                        <option value="">Select a profile</option>
                        {data.profiles.map((p) => (
                            <option value={p.id} key={p.id}>
                                {p.name} · {pid(p.id)}
                            </option>
                        ))}
                    </select>
                </Field>
                <div>
                    <ShieldCheck size={19} />
                    <span>
                        Scores reflect recorded preferences.
                        <small>They do not predict relationship success.</small>
                    </span>
                </div>
                <label className="checkbox-row">
                    <input
                        type="checkbox"
                        checked={shortOnly}
                        onChange={(e) => setShortOnly(e.target.checked)}
                    />
                    Shortlisted only
                </label>
            </Card>
            <ErrorBox message={error} />
            {busy ? (
                <Loading />
            ) : !id ? (
                <Empty
                    title="Choose a profile to begin"
                    text="Suggestions are calculated from the profile’s partner preferences."
                />
            ) : (
                <div className="match-grid">
                    {matches
                        .filter(
                            (m) => !shortOnly || m.decision === "Shortlisted",
                        )
                        .map((m) => (
                            <Card className="match-card" key={m.profile.id}>
                                <div className="profile-card-top">
                                    <span
                                        className={
                                            "avatar large-avatar avatar-" +
                                            (m.profile.gender === "Female"
                                                ? "rose"
                                                : "sage")
                                        }
                                    >
                                        {initials(m.profile.name)}
                                    </span>
                                    <div className="match-score">
                                        {m.score === null ? "—" : m.score + "%"}
                                        <small>
                                            {m.score === null
                                                ? "No preferences"
                                                : "Preference match"}
                                        </small>
                                    </div>
                                </div>
                                <h3>{m.profile.name}</h3>
                                <p className="muted">
                                    {age(m.profile.dob)} years ·{" "}
                                    {m.profile.city}
                                </p>
                                <div className="match-facts">
                                    <span>
                                        <Briefcase size={14} />
                                        {m.profile.profession ||
                                            "Not specified"}
                                    </span>
                                    <span>
                                        <GraduationCap size={14} />
                                        {m.profile.education || "Not specified"}
                                    </span>
                                </div>
                                <div className="match-reasons">
                                    {m.reasons.map((r) => (
                                        <span
                                            key={r.label}
                                            className={
                                                r.matched ? "matched" : ""
                                            }
                                        >
                                            {r.matched ? (
                                                <CheckCircle2 size={14} />
                                            ) : (
                                                <Minus size={14} />
                                            )}{" "}
                                            {r.label}
                                            {r.unknown ? " (unknown)" : ""}
                                        </span>
                                    ))}
                                </div>
                                {m.decision && m.decision !== "Reset" && (
                                    <Badge>{m.decision}</Badge>
                                )}
                                <div className="match-actions">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setCompare(m.profile)}
                                    >
                                        Compare
                                    </Button>
                                    {canWrite && (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                    decide(
                                                        m.profile.id,
                                                        m.decision ===
                                                            "Shortlisted"
                                                            ? "Reset"
                                                            : "Shortlisted",
                                                    )
                                                }
                                            >
                                                <Heart size={14} />
                                                {m.decision === "Shortlisted"
                                                    ? "Unshortlist"
                                                    : "Shortlist"}
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    open("proposal", {
                                                        profile_id: Number(id),
                                                        candidate_ids: [
                                                            m.profile.id,
                                                        ],
                                                    })
                                                }
                                            >
                                                Propose
                                                <ArrowUpRight size={13} />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                aria-label={`Reject ${m.profile.name}`}
                                                onClick={() =>
                                                    decide(
                                                        m.profile.id,
                                                        "Rejected",
                                                    )
                                                }
                                            >
                                                <X size={15} />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </Card>
                        ))}
                    {!matches.length && (
                        <Empty
                            title="No active candidates yet"
                            text="Add active bride and groom profiles to see suggestions."
                        />
                    )}
                </div>
            )}
            <Modal
                open={!!compare}
                onClose={() => setCompare(null)}
                title="Side-by-side comparison"
                wide
                description="Compare the recorded biodata before making an introduction."
            >
                <div className="comparison">
                    {[source, compare].map(
                        (p, i) =>
                            p && (
                                <div key={i}>
                                    <span className="avatar large-avatar">
                                        {initials(p.name)}
                                    </span>
                                    <h2>{p.name}</h2>
                                    {[
                                        ["Age", age(p.dob)],
                                        ["City", p.city],
                                        ["Profession", p.profession],
                                        ["Education", p.education],
                                        ["Marital status", p.marital_status],
                                        ["Religion", p.religion],
                                    ].map(([l, v]) => (
                                        <div className="compare-field" key={l}>
                                            <small>{l}</small>
                                            <strong>
                                                {v || "Not specified"}
                                            </strong>
                                        </div>
                                    ))}
                                </div>
                            ),
                    )}
                </div>
            </Modal>
        </>
    );
}
