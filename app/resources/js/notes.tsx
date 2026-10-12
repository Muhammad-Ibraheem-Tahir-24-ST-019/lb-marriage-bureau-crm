import { useEffect, useState } from "react";
import {
    Plus,
    Search,
    Pin,
    Users,
    User as UserIcon,
    Trash2,
    Edit3,
    ArrowUpRight,
    SlidersHorizontal,
    Tag,
    Clock,
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
import { getNotes, createNote, updateNote, deleteNote, date, pid } from "./lib";
import type { Note, Profile } from "./types";

const COLOR_PRESETS = [
    { name: "Default", value: "#e4e4e7", border: "#71717a" },
    { name: "Yellow", value: "#fef08a", border: "#eab308" },
    { name: "Blue", value: "#bfdbfe", border: "#3b82f6" },
    { name: "Green", value: "#bbf7d0", border: "#22c55e" },
    { name: "Pink", value: "#fbcfe8", border: "#ec4899" },
    { name: "Purple", value: "#e9d5ff", border: "#a855f7" },
    { name: "Amber", value: "#fed7aa", border: "#f97316" },
];

export function NotesPage() {
    const { data, go } = useWorkspace();
    const toast = useToast();

    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterScope, setFilterScope] = useState<"all" | "personal" | "shared">("all");
    const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "title">("newest");
    const [editingNote, setEditingNote] = useState<Note | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Dialog state
    const [formTitle, setFormTitle] = useState("");
    const [formContent, setFormContent] = useState("");
    const [formColor, setFormColor] = useState<string>("#e4e4e7");
    const [formShared, setFormShared] = useState(false);
    const [formPinned, setFormPinned] = useState(false);
    const [formProfileId, setFormProfileId] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);
    const [formError, setFormError] = useState("");

    const loadNotes = async () => {
        setLoading(true);
        try {
            const res = await getNotes();
            setNotes(res.notes || []);
        } catch (e: any) {
            toast(e.message || "Failed to load notes", true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNotes();
    }, []);

    const openCreateDialog = () => {
        setEditingNote(null);
        setFormTitle("");
        setFormContent("");
        setFormColor("#e4e4e7");
        setFormShared(false);
        setFormPinned(false);
        setFormProfileId(null);
        setFormError("");
        setIsCreating(true);
    };

    const openEditDialog = (n: Note) => {
        setEditingNote(n);
        setFormTitle(n.title);
        setFormContent(n.content);
        setFormColor(n.color || "#e4e4e7");
        setFormShared(n.is_shared);
        setFormPinned(n.is_pinned);
        setFormProfileId(n.profile_id);
        setFormError("");
        setIsCreating(false);
    };

    const closeDialog = () => {
        setEditingNote(null);
        setIsCreating(false);
    };

    const handleSaveNote = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setFormError("");

        const payload = {
            title: formTitle.trim(),
            content: formContent.trim(),
            color: formColor,
            is_shared: formShared,
            is_pinned: formPinned,
            profile_id: formProfileId || null,
        };

        try {
            if (editingNote) {
                const res = await updateNote(editingNote.id, payload);
                const updated = res.note || { ...editingNote, ...payload };
                setNotes((prev) => prev.map((n) => (n.id === editingNote.id ? updated : n)));
                toast("Note updated");
            } else {
                const res = await createNote(payload);
                const created = res.note || {
                    id: Date.now(),
                    user_id: data.user.id,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    ...payload,
                };
                setNotes((prev) => [created, ...prev]);
                toast("Note created");
            }
            closeDialog();
        } catch (err: any) {
            setFormError(err.message || "Failed to save note");
        } finally {
            setBusy(false);
        }
    };

    const handleDeleteNote = async (id: number) => {
        if (!confirm("Are you sure you want to delete this note?")) return;
        setBusy(true);
        try {
            await deleteNote(id);
            setNotes((prev) => prev.filter((n) => n.id !== id));
            toast("Note deleted");
            closeDialog();
        } catch (err: any) {
            toast(err.message || "Failed to delete note", true);
        } finally {
            setBusy(false);
        }
    };

    const handleTogglePin = async (e: React.MouseEvent, n: Note) => {
        e.stopPropagation();
        try {
            await updateNote(n.id, { is_pinned: !n.is_pinned });
            setNotes((prev) =>
                prev.map((item) => (item.id === n.id ? { ...item, is_pinned: !item.is_pinned } : item))
            );
            toast(n.is_pinned ? "Note unpinned" : "Note pinned");
        } catch (err: any) {
            toast(err.message || "Could not update pin status", true);
        }
    };

    // Filter & Sort
    const filteredNotes = notes.filter((n) => {
        if (filterScope === "personal" && n.is_shared) return false;
        if (filterScope === "shared" && !n.is_shared) return false;

        const term = search.toLowerCase();
        const profile = data.profiles.find((p) => p.id === n.profile_id);
        const profileMatch = profile ? profile.name.toLowerCase().includes(term) : false;

        return (
            n.title.toLowerCase().includes(term) ||
            n.content.toLowerCase().includes(term) ||
            profileMatch
        );
    });

    const sortedNotes = [...filteredNotes].sort((a, b) => {
        // Pinned always on top
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;

        if (sortOrder === "title") return a.title.localeCompare(b.title);
        if (sortOrder === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return (
        <>
            <PageHeading
                eyebrow="Matchmaking intelligence"
                title="Bureau Notes"
                description="Keep track of personal observations, family conversations, and matchmaking insights."
            >
                <Button onClick={openCreateDialog}>
                    <Plus size={16} />
                    New Note
                </Button>
            </PageHeading>

            {/* Toolbar */}
            <div className="toolbar" style={{ flexWrap: "wrap" }}>
                <div className="search-field">
                    <Search size={16} />
                    <input
                        placeholder="Search notes or profile names…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="tabs-pills">
                    {(["all", "personal", "shared"] as const).map((s) => (
                        <button
                            key={s}
                            className={filterScope === s ? "active" : ""}
                            onClick={() => setFilterScope(s)}
                            style={{ textTransform: "capitalize" }}
                        >
                            {s}
                        </button>
                    ))}
                </div>

                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>Sort:</span>
                    <select
                        className="compact-select"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as any)}
                    >
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                        <option value="title">By title</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <Loading />
            ) : sortedNotes.length === 0 ? (
                <Card>
                    <Empty
                        title={search ? "No matching notes found" : "No notes yet"}
                        text="Write private notes on family discussions, special requirements, or reminders."
                        action={
                            <Button onClick={openCreateDialog}>
                                <Plus size={15} />
                                Create your first note
                            </Button>
                        }
                    />
                </Card>
            ) : (
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
                        gap: 18,
                    }}
                >
                    {sortedNotes.map((n) => {
                        const linkedProfile = data.profiles.find((p) => p.id === n.profile_id);
                        const borderColor =
                            COLOR_PRESETS.find((c) => c.value === n.color)?.border || n.color || "var(--border)";

                        return (
                            <div
                                key={n.id}
                                className="card"
                                onClick={() => openEditDialog(n)}
                                style={{
                                    borderLeft: `4px solid ${borderColor}`,
                                    cursor: "pointer",
                                    display: "flex",
                                    flexDirection: "column",
                                    transition: "transform 0.15s, box-shadow 0.15s",
                                }}
                            >
                                <div style={{ padding: "16px 18px", flex: 1 }}>
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "flex-start",
                                            justifyContent: "space-between",
                                            gap: 8,
                                            marginBottom: 8,
                                        }}
                                    >
                                        <h3
                                            style={{
                                                fontSize: 14,
                                                fontWeight: 650,
                                                lineHeight: 1.3,
                                                margin: 0,
                                            }}
                                        >
                                            {n.title || "Untitled"}
                                        </h3>
                                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                            <button
                                                className="btn-icon"
                                                style={{
                                                    padding: 4,
                                                    minWidth: 24,
                                                    minHeight: 24,
                                                    color: n.is_pinned ? "var(--accent)" : "var(--muted)",
                                                }}
                                                onClick={(e) => handleTogglePin(e, n)}
                                                title={n.is_pinned ? "Unpin note" : "Pin note"}
                                            >
                                                <Pin size={14} fill={n.is_pinned ? "currentColor" : "none"} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Content preview */}
                                    <p
                                        style={{
                                            fontSize: 12,
                                            color: "var(--muted)",
                                            lineHeight: 1.6,
                                            margin: 0,
                                            display: "-webkit-box",
                                            WebkitLineClamp: 3,
                                            WebkitBoxOrient: "vertical",
                                            overflow: "hidden",
                                            whiteSpace: "pre-wrap",
                                        }}
                                    >
                                        {n.content || "Empty note"}
                                    </p>
                                </div>

                                {/* Card bottom metadata */}
                                <div
                                    style={{
                                        padding: "10px 18px",
                                        borderTop: "1px solid var(--border)",
                                        background: "var(--sidebar)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        fontSize: 10,
                                        color: "var(--muted)",
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                        {n.is_shared ? (
                                            <Badge tone="green">Shared</Badge>
                                        ) : (
                                            <Badge>Personal</Badge>
                                        )}

                                        {linkedProfile && (
                                            <span
                                                style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: 3,
                                                    color: "var(--accent)",
                                                    fontWeight: 500,
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    go(`profiles/${linkedProfile.id}`);
                                                }}
                                            >
                                                <Tag size={10} />
                                                {linkedProfile.name}
                                            </span>
                                        )}
                                    </div>

                                    <span>{date(n.created_at)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Note Create/Edit Modal */}
            <Modal
                open={isCreating || !!editingNote}
                onClose={closeDialog}
                title={editingNote ? "Edit Note" : "New Note"}
                description="Organize observations, meeting summaries, and profile-specific notes."
                wide
            >
                <form onSubmit={handleSaveNote}>
                    <div className="dialog-body stack">
                        <ErrorBox message={formError} />

                        <Field label="Title *">
                            <input
                                required
                                placeholder="Note title, e.g. Khan family expectations"
                                value={formTitle}
                                onChange={(e) => setFormTitle(e.target.value)}
                            />
                        </Field>

                        <Field label="Content *">
                            <textarea
                                required
                                rows={6}
                                placeholder="Write your notes here (supports markdown)..."
                                value={formContent}
                                onChange={(e) => setFormContent(e.target.value)}
                            />
                        </Field>

                        <div className="form-grid">
                            <Field label="Link to Profile (Optional)">
                                <select
                                    value={formProfileId || ""}
                                    onChange={(e) =>
                                        setFormProfileId(e.target.value ? Number(e.target.value) : null)
                                    }
                                >
                                    <option value="">No linked profile</option>
                                    {data.profiles.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} ({pid(p.id)})
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <div>
                                <span
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 550,
                                        display: "block",
                                        marginBottom: 7,
                                    }}
                                >
                                    Color Tag
                                </span>
                                <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                                    {COLOR_PRESETS.map((c) => (
                                        <button
                                            type="button"
                                            key={c.value}
                                            title={c.name}
                                            onClick={() => setFormColor(c.value)}
                                            style={{
                                                width: 24,
                                                height: 24,
                                                borderRadius: "50%",
                                                backgroundColor: c.value,
                                                border:
                                                    formColor === c.value
                                                        ? `2px solid ${c.border}`
                                                        : "1px solid var(--border)",
                                                cursor: "pointer",
                                                display: "grid",
                                                placeItems: "center",
                                            }}
                                        >
                                            {formColor === c.value && (
                                                <Check size={12} color={c.border} />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", paddingTop: 6 }}>
                            <label className="checkbox-row">
                                <input
                                    type="checkbox"
                                    checked={formShared}
                                    onChange={(e) => setFormShared(e.target.checked)}
                                />
                                <span>Shared with bureau team</span>
                            </label>

                            <label className="checkbox-row">
                                <input
                                    type="checkbox"
                                    checked={formPinned}
                                    onChange={(e) => setFormPinned(e.target.checked)}
                                />
                                <span>Pin to top</span>
                            </label>
                        </div>
                    </div>

                    <div className="dialog-footer">
                        {editingNote ? (
                            <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                onClick={() => handleDeleteNote(editingNote.id)}
                                disabled={busy}
                            >
                                <Trash2 size={14} />
                                Delete
                            </Button>
                        ) : (
                            <div />
                        )}

                        <div style={{ display: "flex", gap: 8 }}>
                            <Button type="button" variant="outline" onClick={closeDialog}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={busy}>
                                {busy ? "Saving…" : "Save Note"}
                            </Button>
                        </div>
                    </div>
                </form>
            </Modal>
        </>
    );
}
export default NotesPage;
