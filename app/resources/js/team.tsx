import { useEffect, useRef, useState } from "react";
import {
    Hash,
    Megaphone,
    Send,
    MessageSquare,
    CornerDownRight,
    Plus,
    X,
    Users,
    ChevronRight,
    Pin,
    AlertCircle,
} from "lucide-react";
import { useWorkspace } from "./workspace";
import { Button, Card, Badge, Empty, Loading, useToast, Modal, Field } from "./ui";
import {
    getTeamChannels,
    getTeamMessages,
    sendTeamMessage,
    initials,
    timeAgo,
    date,
} from "./lib";
import type { TeamMessage, TeamChannel } from "./types";

export function TeamPage() {
    const { data } = useWorkspace();
    const toast = useToast();

    const [channels, setChannels] = useState<TeamChannel[]>([
        { name: "general", message_count: 0, last_message_at: null },
        { name: "announcements", message_count: 0, last_message_at: null },
        { name: "matchmaking", message_count: 0, last_message_at: null },
        { name: "followups", message_count: 0, last_message_at: null },
    ]);
    const [activeChannel, setActiveChannel] = useState("general");
    const [messages, setMessages] = useState<TeamMessage[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(true);
    const [input, setInput] = useState("");
    const [isAnnouncement, setIsAnnouncement] = useState(false);
    const [sending, setSending] = useState(false);
    const [replyingTo, setReplyingTo] = useState<TeamMessage | null>(null);
    const [threadDrawer, setThreadDrawer] = useState<TeamMessage | null>(null);

    // New Channel dialog
    const [newChannelModal, setNewChannelModal] = useState(false);
    const [newChannelName, setNewChannelName] = useState("");

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const isPrivileged = ["owner", "admin", "manager"].includes(data.user.role);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const loadChannels = async () => {
        try {
            const res = await getTeamChannels();
            if (res.channels && res.channels.length > 0) {
                // Ensure default channels are included if not present
                const loaded = res.channels as TeamChannel[];
                const existingNames = new Set(loaded.map((c) => c.name));
                const defaults = ["general", "announcements", "matchmaking", "followups"]
                    .filter((name) => !existingNames.has(name))
                    .map((name) => ({ name, message_count: 0, last_message_at: null }));
                setChannels([...loaded, ...defaults]);
            }
        } catch {
            // Keep default channels
        }
    };

    const loadMessages = async (channel: string) => {
        setLoadingMessages(true);
        try {
            const res = await getTeamMessages(channel);
            setMessages(res.messages || []);
        } catch (e: any) {
            toast(e.message || "Failed to load messages", true);
        } finally {
            setLoadingMessages(false);
        }
    };

    useEffect(() => {
        loadChannels();
    }, []);

    useEffect(() => {
        loadMessages(activeChannel);
        setThreadDrawer(null);
        setReplyingTo(null);
    }, [activeChannel]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const text = input.trim();
        if (!text || sending) return;

        setSending(true);
        const payload = {
            channel: activeChannel,
            content: text,
            is_announcement: activeChannel === "announcements" ? true : isAnnouncement,
            reply_to: replyingTo?.id || null,
        };

        try {
            const res = await sendTeamMessage(payload);
            const newMsg: TeamMessage = res.message || {
                id: Date.now(),
                user_id: data.user.id,
                channel: activeChannel,
                content: text,
                is_announcement: payload.is_announcement,
                reply_to: payload.reply_to,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                user: data.user,
                replies: [],
            };

            if (replyingTo) {
                // Update parent message's replies list
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === replyingTo.id
                            ? { ...m, replies: [...(m.replies || []), newMsg] }
                            : m
                    )
                );
                if (threadDrawer && threadDrawer.id === replyingTo.id) {
                    setThreadDrawer((prev) =>
                        prev ? { ...prev, replies: [...(prev.replies || []), newMsg] } : null
                    );
                }
            } else {
                setMessages((prev) => [...prev, newMsg]);
            }

            setInput("");
            setIsAnnouncement(false);
            setReplyingTo(null);
        } catch (err: any) {
            toast(err.message || "Failed to send message", true);
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleCreateChannel = (e: React.FormEvent) => {
        e.preventDefault();
        const clean = newChannelName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
        if (!clean) return;

        if (channels.some((c) => c.name === clean)) {
            toast("Channel already exists", true);
            return;
        }

        const newChan: TeamChannel = {
            name: clean,
            message_count: 0,
            last_message_at: null,
        };

        setChannels((prev) => [...prev, newChan]);
        setActiveChannel(clean);
        setNewChannelModal(false);
        setNewChannelName("");
        toast(`Joined #${clean}`);
    };

    return (
        <div
            style={{
                display: "flex",
                height: "calc(100vh - 70px)",
                margin: "-30px -34px 0",
                overflow: "hidden",
                background: "var(--surface)",
                borderTop: "1px solid var(--border)",
            }}
        >
            {/* Left Sidebar: Channels */}
            <aside
                style={{
                    width: 250,
                    minWidth: 250,
                    borderRight: "1px solid var(--border)",
                    background: "var(--sidebar)",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <div
                    style={{
                        padding: "16px 18px",
                        borderBottom: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <Users size={17} style={{ color: "var(--accent)" }} />
                        <strong style={{ fontSize: 13 }}>Team Channels</strong>
                    </div>
                    {isPrivileged && (
                        <button
                            className="btn-icon"
                            style={{ padding: 4, minWidth: 26, minHeight: 26, color: "var(--muted)" }}
                            onClick={() => setNewChannelModal(true)}
                            title="Create Channel"
                        >
                            <Plus size={15} />
                        </button>
                    )}
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: "10px 8px" }}>
                    <div
                        style={{
                            fontSize: 10,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            color: "var(--muted)",
                            padding: "6px 10px",
                        }}
                    >
                        Channels
                    </div>

                    {channels.map((c) => {
                        const isActive = activeChannel === c.name;
                        const isAnnounce = c.name === "announcements";
                        return (
                            <button
                                key={c.name}
                                onClick={() => setActiveChannel(c.name)}
                                style={{
                                    width: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    padding: "8px 10px",
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: isActive ? 600 : 450,
                                    color: isActive ? "var(--text)" : "var(--muted)",
                                    background: isActive ? "var(--surface)" : "transparent",
                                    border: isActive ? "1px solid var(--border)" : "1px solid transparent",
                                    marginBottom: 2,
                                    textAlign: "left",
                                    cursor: "pointer",
                                }}
                            >
                                {isAnnounce ? (
                                    <Megaphone size={14} style={{ color: "var(--amber)" }} />
                                ) : (
                                    <Hash size={14} />
                                )}
                                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {c.name}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </aside>

            {/* Main Area: Feed */}
            <main
                style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    minWidth: 0,
                    height: "100%",
                    background: "var(--surface)",
                }}
            >
                {/* Channel Header */}
                <header
                    style={{
                        height: 52,
                        padding: "0 24px",
                        borderBottom: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexShrink: 0,
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {activeChannel === "announcements" ? (
                            <Megaphone size={16} style={{ color: "var(--amber)" }} />
                        ) : (
                            <Hash size={16} style={{ color: "var(--muted)" }} />
                        )}
                        <h2 style={{ fontSize: 14, fontWeight: 650 }}>{activeChannel}</h2>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>
                            · {messages.length} messages
                        </span>
                    </div>

                    {activeChannel === "announcements" && (
                        <Badge tone="amber">Bureau Broadcasts</Badge>
                    )}
                </header>

                {/* Messages feed */}
                <div
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "20px 28px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                    }}
                >
                    {loadingMessages ? (
                        <Loading />
                    ) : messages.length === 0 ? (
                        <div style={{ margin: "auto", textAlign: "center", padding: 30 }}>
                            <Empty
                                title={`Welcome to #${activeChannel}`}
                                text="Start the team conversation here. Discuss proposals, client notes, or coordinate tasks."
                            />
                        </div>
                    ) : (
                        messages.map((m) => {
                            const sender =
                                m.user ||
                                data.staff.find((s) => s.id === m.user_id) || {
                                    name: "Team Member",
                                    email: "",
                                };
                            const replyCount = m.replies?.length || 0;

                            return (
                                <div
                                    key={m.id}
                                    style={{
                                        display: "flex",
                                        gap: 12,
                                        padding: m.is_announcement ? "12px 16px" : "6px 0",
                                        background: m.is_announcement ? "var(--amber-bg)" : "transparent",
                                        border: m.is_announcement ? "1px solid var(--amber)" : "none",
                                        borderRadius: 8,
                                    }}
                                >
                                    <span
                                        className="avatar"
                                        style={{ width: 34, height: 34, fontSize: 11, flexShrink: 0 }}
                                    >
                                        {initials(sender.name)}
                                    </span>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 8,
                                                marginBottom: 3,
                                            }}
                                        >
                                            <strong style={{ fontSize: 12 }}>{sender.name}</strong>
                                            {m.is_announcement && (
                                                <Badge tone="amber">Announcement</Badge>
                                            )}
                                            <span style={{ fontSize: 10, color: "var(--muted)" }}>
                                                {timeAgo(m.created_at)}
                                            </span>
                                        </div>

                                        <p
                                            style={{
                                                fontSize: 12.5,
                                                lineHeight: 1.55,
                                                margin: 0,
                                                whiteSpace: "pre-wrap",
                                                wordBreak: "break-word",
                                            }}
                                        >
                                            {m.content}
                                        </p>

                                        {/* Actions & Thread */}
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 12,
                                                marginTop: 6,
                                                fontSize: 11,
                                            }}
                                        >
                                            <button
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 4,
                                                    color: "var(--muted)",
                                                    cursor: "pointer",
                                                }}
                                                onClick={() => {
                                                    setReplyingTo(m);
                                                    inputRef.current?.focus();
                                                }}
                                            >
                                                <CornerDownRight size={12} />
                                                <span>Reply</span>
                                            </button>

                                            {replyCount > 0 && (
                                                <button
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 4,
                                                        color: "var(--accent)",
                                                        fontWeight: 500,
                                                        cursor: "pointer",
                                                    }}
                                                    onClick={() => setThreadDrawer(m)}
                                                >
                                                    <MessageSquare size={12} />
                                                    <span>
                                                        {replyCount} {replyCount === 1 ? "reply" : "replies"}
                                                    </span>
                                                </button>
                                            )}
                                        </div>

                                        {/* In-feed preview of recent replies */}
                                        {replyCount > 0 && !threadDrawer && (
                                            <div
                                                style={{
                                                    marginTop: 8,
                                                    paddingLeft: 12,
                                                    borderLeft: "2px solid var(--border)",
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: 6,
                                                }}
                                            >
                                                {m.replies!.slice(-2).map((rep) => {
                                                    const repSender =
                                                        rep.user ||
                                                        data.staff.find((s) => s.id === rep.user_id) || {
                                                            name: "Team Member",
                                                        };
                                                    return (
                                                        <div key={rep.id} style={{ fontSize: 11.5 }}>
                                                            <strong style={{ fontSize: 11, marginRight: 6 }}>
                                                                {repSender.name}:
                                                            </strong>
                                                            <span style={{ color: "var(--muted)" }}>
                                                                {rep.content}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Bottom Input Area */}
                <div
                    style={{
                        padding: "12px 24px 18px",
                        borderTop: "1px solid var(--border)",
                        background: "var(--surface)",
                        flexShrink: 0,
                    }}
                >
                    {replyingTo && (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "6px 12px",
                                background: "var(--soft)",
                                borderRadius: "6px 6px 0 0",
                                border: "1px solid var(--border)",
                                borderBottom: "none",
                                fontSize: 11,
                                color: "var(--muted)",
                            }}
                        >
                            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <CornerDownRight size={12} />
                                Replying to <strong>{replyingTo.user?.name || "message"}</strong>
                            </span>
                            <button
                                onClick={() => setReplyingTo(null)}
                                style={{ cursor: "pointer", color: "var(--muted)" }}
                            >
                                <X size={13} />
                            </button>
                        </div>
                    )}

                    <div
                        style={{
                            border: "1px solid var(--border)",
                            borderRadius: replyingTo ? "0 0 10px 10px" : 10,
                            padding: "8px 12px",
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                            background: "var(--surface)",
                        }}
                    >
                        <textarea
                            ref={inputRef}
                            style={{
                                border: "none",
                                boxShadow: "none",
                                padding: 0,
                                resize: "none",
                                minHeight: 38,
                                maxHeight: 120,
                                fontSize: 12.5,
                            }}
                            placeholder={`Message #${activeChannel}…`}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={sending}
                        />

                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                {isPrivileged && activeChannel !== "announcements" && (
                                    <label
                                        className="checkbox-row"
                                        style={{ fontSize: 11, color: "var(--muted)" }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isAnnouncement}
                                            onChange={(e) => setIsAnnouncement(e.target.checked)}
                                        />
                                        <span>Mark as Announcement</span>
                                    </label>
                                )}
                            </div>

                            <Button
                                size="sm"
                                onClick={() => handleSendMessage()}
                                disabled={!input.trim() || sending}
                            >
                                <Send size={14} />
                                Send
                            </Button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Thread Drawer (if thread open) */}
            {threadDrawer && (
                <div
                    style={{
                        width: 320,
                        borderLeft: "1px solid var(--border)",
                        background: "var(--surface)",
                        display: "flex",
                        flexDirection: "column",
                        height: "100%",
                    }}
                >
                    <div
                        style={{
                            height: 52,
                            padding: "0 18px",
                            borderBottom: "1px solid var(--border)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}
                    >
                        <strong style={{ fontSize: 13 }}>Thread</strong>
                        <button
                            onClick={() => setThreadDrawer(null)}
                            style={{ cursor: "pointer", color: "var(--muted)" }}
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>
                        {/* Parent Message */}
                        <div style={{ paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                                <strong style={{ fontSize: 12 }}>
                                    {threadDrawer.user?.name || "Team Member"}
                                </strong>
                                <small>{timeAgo(threadDrawer.created_at)}</small>
                            </div>
                            <p style={{ fontSize: 12, margin: 0 }}>{threadDrawer.content}</p>
                        </div>

                        {/* Thread Replies */}
                        <div style={{ paddingTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                            {threadDrawer.replies?.map((r) => (
                                <div key={r.id}>
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 7,
                                            marginBottom: 3,
                                        }}
                                    >
                                        <strong style={{ fontSize: 11.5 }}>
                                            {r.user?.name || "Team Member"}
                                        </strong>
                                        <small>{timeAgo(r.created_at)}</small>
                                    </div>
                                    <p style={{ fontSize: 12, margin: 0 }}>{r.content}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
                        <Button
                            size="sm"
                            style={{ width: "100%" }}
                            onClick={() => {
                                setReplyingTo(threadDrawer);
                                inputRef.current?.focus();
                            }}
                        >
                            Reply in Channel
                        </Button>
                    </div>
                </div>
            )}

            {/* Create Channel Modal */}
            <Modal
                open={newChannelModal}
                onClose={() => setNewChannelModal(false)}
                title="Create a Channel"
                description="Channels help coordinate specific matchmaking topics, teams, or regions."
            >
                <form onSubmit={handleCreateChannel}>
                    <div className="dialog-body stack">
                        <Field label="Channel Name *">
                            <input
                                required
                                placeholder="e.g. islamabad-candidates"
                                value={newChannelName}
                                onChange={(e) => setNewChannelName(e.target.value)}
                            />
                        </Field>
                    </div>
                    <div className="dialog-footer">
                        <div />
                        <div style={{ display: "flex", gap: 8 }}>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setNewChannelModal(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit">Create Channel</Button>
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
export default TeamPage;
