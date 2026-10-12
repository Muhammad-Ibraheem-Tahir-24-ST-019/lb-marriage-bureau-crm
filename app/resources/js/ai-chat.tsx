import React, { useEffect, useRef, useState } from "react";
import {
    Bot,
    Plus,
    Search,
    Send,
    Trash2,
    Pin,
    Copy,
    Check,
    ChevronDown,
    ChevronRight,
    Wrench,
    Sparkles,
    PanelLeft,
    Clock,
    RefreshCw,
    AlertCircle,
} from "lucide-react";
import { useWorkspace } from "./workspace";
import { Button, Card, Empty, Loading, useToast } from "./ui";
import {
    getAiConversations,
    getAiConversation,
    createAiConversation,
    deleteAiConversation,
    sendAiMessage,
    initials,
    timeAgo,
    date,
    copy,
} from "./lib";
import type { AiConversation, AiMessage, AiToolCall } from "./types";

// Clean lightweight Markdown Renderer
function Markdown({ content }: { content: string }) {
    if (!content) return null;

    const renderMarkdown = (text: string) => {
        // Split by code blocks first
        const parts = text.split(/(```[\s\S]*?```)/g);

        return parts.map((part, pIdx) => {
            if (part.startsWith("```") && part.endsWith("```")) {
                const lines = part.slice(3, -3).trim().split("\n");
                const lang = lines[0].match(/^[a-zA-Z0-9_-]+$/) ? lines[0] : "";
                const code = lang ? lines.slice(1).join("\n") : lines.join("\n");
                return (
                    <pre key={pIdx}>
                        <code>{code}</code>
                    </pre>
                );
            }

            // Tables check
            const lines = part.split("\n");
            const elements: React.ReactNode[] = [];
            let inList: "ul" | "ol" | null = null;
            let listItems: React.ReactNode[] = [];
            let inTable = false;
            let tableRows: string[][] = [];

            const flushList = () => {
                if (inList && listItems.length > 0) {
                    if (inList === "ul") {
                        elements.push(<ul key={`ul-${elements.length}`}>{listItems}</ul>);
                    } else {
                        elements.push(<ol key={`ol-${elements.length}`}>{listItems}</ol>);
                    }
                    inList = null;
                    listItems = [];
                }
            };

            const flushTable = () => {
                if (inTable && tableRows.length > 0) {
                    const header = tableRows[0];
                    const rows = tableRows.slice(2); // Skip separator row
                    elements.push(
                        <table key={`table-${elements.length}`}>
                            <thead>
                                <tr>
                                    {header.map((col, cIdx) => (
                                        <th key={cIdx}>{formatInline(col.trim())}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, rIdx) => (
                                    <tr key={rIdx}>
                                        {row.map((col, cIdx) => (
                                            <td key={cIdx}>{formatInline(col.trim())}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    );
                    inTable = false;
                    tableRows = [];
                }
            };

            lines.forEach((line, lIdx) => {
                const trimmed = line.trim();

                // Table row
                if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
                    flushList();
                    inTable = true;
                    const cols = trimmed
                        .slice(1, -1)
                        .split("|")
                        .map((c) => c.trim());
                    tableRows.push(cols);
                    return;
                } else if (inTable) {
                    flushTable();
                }

                // Headers
                if (trimmed.startsWith("### ")) {
                    flushList();
                    elements.push(<h3 key={lIdx}>{formatInline(trimmed.slice(4))}</h3>);
                    return;
                }
                if (trimmed.startsWith("## ")) {
                    flushList();
                    elements.push(<h2 key={lIdx}>{formatInline(trimmed.slice(3))}</h2>);
                    return;
                }
                if (trimmed.startsWith("# ")) {
                    flushList();
                    elements.push(<h1 key={lIdx}>{formatInline(trimmed.slice(2))}</h1>);
                    return;
                }

                // Bullet lists
                if (/^[-*]\s+/.test(trimmed)) {
                    if (inList !== "ul") {
                        flushList();
                        inList = "ul";
                    }
                    listItems.push(<li key={lIdx}>{formatInline(trimmed.replace(/^[-*]\s+/, ""))}</li>);
                    return;
                }

                // Numbered lists
                if (/^\d+\.\s+/.test(trimmed)) {
                    if (inList !== "ol") {
                        flushList();
                        inList = "ol";
                    }
                    listItems.push(<li key={lIdx}>{formatInline(trimmed.replace(/^\d+\.\s+/, ""))}</li>);
                    return;
                }

                // Non-list line
                flushList();

                if (trimmed === "") {
                    return;
                }

                elements.push(<p key={lIdx}>{formatInline(trimmed)}</p>);
            });

            flushList();
            flushTable();

            return <React.Fragment key={pIdx}>{elements}</React.Fragment>;
        });
    };

    const formatInline = (text: string): React.ReactNode => {
        // Simple inline parser for **bold**, *italic*, `code`, and [link](url)
        const parts: React.ReactNode[] = [];
        let remaining = text;
        let key = 0;

        while (remaining.length > 0) {
            // Bold **text**
            const boldMatch = remaining.match(/^([\s\S]*?)\*\*(.+?)\*\*([\s\S]*)$/);
            // Inline code `code`
            const codeMatch = remaining.match(/^([\s\S]*?)`([^`]+)`([\s\S]*)$/);
            // Italic *text*
            const italicMatch = remaining.match(/^([\s\S]*?)\*([^*]+)\*([\s\S]*)$/);

            if (codeMatch && (!boldMatch || codeMatch.index! <= boldMatch.index!)) {
                if (codeMatch[1]) parts.push(codeMatch[1]);
                parts.push(<code key={key++}>{codeMatch[2]}</code>);
                remaining = codeMatch[3];
                continue;
            }

            if (boldMatch) {
                if (boldMatch[1]) parts.push(boldMatch[1]);
                parts.push(<strong key={key++}>{boldMatch[2]}</strong>);
                remaining = boldMatch[3];
                continue;
            }

            if (italicMatch) {
                if (italicMatch[1]) parts.push(italicMatch[1]);
                parts.push(<em key={key++}>{italicMatch[2]}</em>);
                remaining = italicMatch[3];
                continue;
            }

            parts.push(remaining);
            break;
        }

        return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : <>{parts}</>;
    };

    return <div className="ai-markdown-content">{renderMarkdown(content)}</div>;
}

// Tool call card
function ToolCallCard({ toolCall, result }: { toolCall: AiToolCall; result?: any }) {
    const [open, setOpen] = useState(false);
    const fnName = toolCall.function?.name || "function";

    // Prettify function name for display
    const label = fnName
        .replace(/^execute_|^call_/, "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

    return (
        <div className="ai-tool-card">
            <div className="ai-tool-header" onClick={() => setOpen(!open)}>
                <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <Wrench size={13} style={{ color: "var(--accent)" }} />
                    <span>Action: {label}</span>
                </span>
                {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
            {open && (
                <div className="ai-tool-content">
                    {toolCall.function?.arguments && (
                        <div style={{ marginBottom: 6 }}>
                            <strong style={{ fontSize: 10, color: "var(--muted)" }}>Arguments:</strong>
                            <pre>{toolCall.function.arguments}</pre>
                        </div>
                    )}
                    {result !== undefined && (
                        <div>
                            <strong style={{ fontSize: 10, color: "var(--muted)" }}>Result:</strong>
                            <pre>{typeof result === "string" ? result : JSON.stringify(result, null, 2)}</pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export function AiChatPage() {
    const { data } = useWorkspace();
    const toast = useToast();

    const [conversations, setConversations] = useState<AiConversation[]>([]);
    const [activeId, setActiveId] = useState<number | null>(null);
    const [messages, setMessages] = useState<AiMessage[]>([]);
    const [input, setInput] = useState("");
    const [search, setSearch] = useState("");
    const [loadingList, setLoadingList] = useState(true);
    const [loadingChat, setLoadingChat] = useState(false);
    const [sending, setSending] = useState(false);
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const [showSidebarMobile, setShowSidebarMobile] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, sending]);

    // Load conversation list
    const fetchConversations = async () => {
        try {
            const res = await getAiConversations();
            const list: AiConversation[] = res.conversations || [];
            setConversations(list);
            return list;
        } catch (e: any) {
            toast(e.message || "Failed to load AI conversations", true);
            return [];
        } finally {
            setLoadingList(false);
        }
    };

    useEffect(() => {
        fetchConversations();
    }, []);

    // Load messages when activeId changes
    useEffect(() => {
        if (!activeId) {
            setMessages([]);
            return;
        }

        let isCurrent = true;
        setLoadingChat(true);

        getAiConversation(activeId)
            .then((res) => {
                if (isCurrent) {
                    setMessages(res.messages || []);
                }
            })
            .catch((e: any) => {
                if (isCurrent) {
                    toast(e.message || "Could not load messages", true);
                }
            })
            .finally(() => {
                if (isCurrent) setLoadingChat(false);
            });

        return () => {
            isCurrent = false;
        };
    }, [activeId]);

    // Create a new conversation
    const handleNewChat = () => {
        setActiveId(null);
        setMessages([]);
        setInput("");
        setShowSidebarMobile(false);
        inputRef.current?.focus();
    };

    // Delete a conversation
    const handleDeleteConversation = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        try {
            await deleteAiConversation(id);
            setConversations((prev) => prev.filter((c) => c.id !== id));
            if (activeId === id) {
                setActiveId(null);
                setMessages([]);
            }
            toast("Conversation deleted");
        } catch (err: any) {
            toast(err.message || "Failed to delete conversation", true);
        }
    };

    // Send a message
    const handleSendMessage = async (textToSend?: string) => {
        const text = (textToSend || input).trim();
        if (!text || sending) return;

        setInput("");
        setSending(true);

        // Optimistically add user message
        const optimisticMsg: AiMessage = {
            id: Date.now(),
            conversation_id: activeId || 0,
            role: "user",
            content: text,
            tool_calls: null,
            tool_results: null,
            tokens_used: null,
            model_used: null,
            created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, optimisticMsg]);

        try {
            const res = await sendAiMessage(activeId, text);
            const returnedMsg: AiMessage = res.message;
            const convId = res.conversation_id || activeId;

            if (convId && convId !== activeId) {
                setActiveId(convId);
            }

            // Append assistant response
            if (returnedMsg) {
                setMessages((prev) => [...prev, returnedMsg]);
            }

            // Refresh conversation list to get updated titles & order
            fetchConversations();
        } catch (err: any) {
            toast(err.message || "Error generating response", true);
            // Append error notice in chat
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now() + 1,
                    conversation_id: activeId || 0,
                    role: "assistant",
                    content: `⚠️ Error: ${err.message || "Something went wrong while connecting to the AI assistant."}`,
                    tool_calls: null,
                    tool_results: null,
                    tokens_used: null,
                    model_used: null,
                    created_at: new Date().toISOString(),
                },
            ]);
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

    const handleCopy = async (id: number, text: string) => {
        try {
            await copy(text);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
            toast("Message copied");
        } catch {
            toast("Failed to copy", true);
        }
    };

    const filteredConversations = conversations.filter((c) =>
        c.title.toLowerCase().includes(search.toLowerCase())
    );

    const pinnedConversations = filteredConversations.filter((c) => c.is_pinned);
    const normalConversations = filteredConversations.filter((c) => !c.is_pinned);

    const activeConversation = conversations.find((c) => c.id === activeId);

    const suggestedPrompts = [
        {
            title: "Today's summary report",
            desc: "Get an overview of active proposals and pending follow-ups",
            prompt: "Show me today's report and summary of bureau activities.",
        },
        {
            title: "Search profiles in Lahore",
            desc: "Find compatible female profiles based in Lahore",
            prompt: "Search for female profiles in Lahore with education and profession details.",
        },
        {
            title: "Overdue tasks & follow-ups",
            desc: "Check which family meetings or calls need attention",
            prompt: "What tasks and follow-ups are overdue or due today?",
        },
        {
            title: "Draft family follow-up",
            desc: "Compose a respectful proposal check-in message",
            prompt: "Draft a polite WhatsApp message to follow up with a family regarding their shared proposal shortlist.",
        },
    ];

    return (
        <div className="ai-chat-container">
            {/* Left Sidebar */}
            <aside className={`ai-sidebar ${showSidebarMobile ? "open" : ""}`}>
                <div className="ai-sidebar-header">
                    <Button className="ai-new-chat-btn" onClick={handleNewChat}>
                        <Plus size={16} />
                        New Chat
                    </Button>
                    <div className="ai-search-box">
                        <Search size={14} />
                        <input
                            placeholder="Search chats…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="ai-conv-list">
                    {loadingList ? (
                        <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 11 }}>
                            Loading conversations…
                        </div>
                    ) : filteredConversations.length === 0 ? (
                        <div style={{ padding: 25, textAlign: "center", color: "var(--muted)", fontSize: 11 }}>
                            {search ? "No matching conversations" : "No chats yet. Start a new conversation."}
                        </div>
                    ) : (
                        <>
                            {pinnedConversations.length > 0 && (
                                <>
                                    <div className="ai-conv-section-title">Pinned</div>
                                    {pinnedConversations.map((c) => (
                                        <div
                                            key={c.id}
                                            className={`ai-conv-item ${activeId === c.id ? "active" : ""}`}
                                            onClick={() => {
                                                setActiveId(c.id);
                                                setShowSidebarMobile(false);
                                            }}
                                        >
                                            <div className="ai-conv-item-info">
                                                <span className="ai-conv-title">{c.title || "Untitled Chat"}</span>
                                                <span className="ai-conv-meta">
                                                    <Clock size={10} />
                                                    {timeAgo(c.updated_at)}
                                                </span>
                                            </div>
                                            <div className="ai-conv-actions">
                                                <button
                                                    className="ai-conv-act-btn"
                                                    title="Delete"
                                                    onClick={(e) => handleDeleteConversation(e, c.id)}
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}

                            {normalConversations.length > 0 && (
                                <>
                                    {pinnedConversations.length > 0 && (
                                        <div className="ai-conv-section-title">Recent</div>
                                    )}
                                    {normalConversations.map((c) => (
                                        <div
                                            key={c.id}
                                            className={`ai-conv-item ${activeId === c.id ? "active" : ""}`}
                                            onClick={() => {
                                                setActiveId(c.id);
                                                setShowSidebarMobile(false);
                                            }}
                                        >
                                            <div className="ai-conv-item-info">
                                                <span className="ai-conv-title">{c.title || "Untitled Chat"}</span>
                                                <span className="ai-conv-meta">
                                                    <Clock size={10} />
                                                    {timeAgo(c.updated_at)}
                                                </span>
                                            </div>
                                            <div className="ai-conv-actions">
                                                <button
                                                    className="ai-conv-act-btn"
                                                    title="Delete"
                                                    onClick={(e) => handleDeleteConversation(e, c.id)}
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </>
                    )}
                </div>
            </aside>

            {/* Main Chat Area */}
            <main className="ai-main-chat">
                <header className="ai-chat-header">
                    <div className="ai-header-title">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="mobile-toggle"
                            style={{ display: "inline-flex" }}
                            onClick={() => setShowSidebarMobile(!showSidebarMobile)}
                            aria-label="Toggle sidebar"
                        >
                            <PanelLeft size={17} />
                        </Button>
                        <Bot size={18} style={{ color: "var(--accent)" }} />
                        <h2>{activeConversation?.title || "LB Matchmaker AI Assistant"}</h2>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {activeId && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleDeleteConversation(e, activeId)}
                                title="Delete this conversation"
                            >
                                <Trash2 size={14} />
                                <span style={{ fontSize: 11 }}>Clear</span>
                            </Button>
                        )}
                    </div>
                </header>

                {/* Messages Feed */}
                <div className="ai-messages-scroll">
                    {loadingChat ? (
                        <Loading />
                    ) : messages.length === 0 ? (
                        <div className="ai-welcome-box">
                            <div className="ai-welcome-icon">
                                <Sparkles size={26} />
                            </div>
                            <h1>How can I assist your bureau today?</h1>
                            <p>
                                Ask queries about profiles, draft proposal notes, inspect overdue follow-ups, or
                                generate daily activity reports with your intelligent bureau assistant.
                            </p>

                            <div className="ai-suggestions-grid">
                                {suggestedPrompts.map((s, idx) => (
                                    <div
                                        key={idx}
                                        className="ai-suggestion-card"
                                        onClick={() => handleSendMessage(s.prompt)}
                                    >
                                        <strong>{s.title}</strong>
                                        <span>{s.desc}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <>
                            {messages.map((m) => {
                                const isUser = m.role === "user";
                                return (
                                    <div key={m.id} className={`ai-message-row ${m.role}`}>
                                        <div className={`ai-msg-avatar ${isUser ? "usr" : "bot"}`}>
                                            {isUser ? initials(data.user.name) : <Bot size={16} />}
                                        </div>

                                        <div className="ai-msg-body">
                                            <div className="ai-bubble">
                                                {/* Tool Calls if any */}
                                                {m.tool_calls && m.tool_calls.length > 0 && (
                                                    <div style={{ marginBottom: m.content ? 8 : 0 }}>
                                                        {m.tool_calls.map((tc, idx) => (
                                                            <ToolCallCard
                                                                key={tc.id || idx}
                                                                toolCall={tc}
                                                                result={m.tool_results?.[idx]}
                                                            />
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Text Content */}
                                                {m.content && <Markdown content={m.content} />}
                                            </div>

                                            {/* Footer metadata */}
                                            <div className="ai-msg-footer">
                                                <span>{date(m.created_at, true)}</span>
                                                {m.tokens_used ? (
                                                    <span>· {m.tokens_used} tokens</span>
                                                ) : null}
                                                {m.content && (
                                                    <button
                                                        className="ai-copy-btn"
                                                        onClick={() => handleCopy(m.id, m.content || "")}
                                                        title="Copy text"
                                                    >
                                                        {copiedId === m.id ? (
                                                            <Check size={11} style={{ color: "var(--green)" }} />
                                                        ) : (
                                                            <Copy size={11} />
                                                        )}
                                                        <span>{copiedId === m.id ? "Copied" : "Copy"}</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {sending && (
                                <div className="ai-message-row assistant">
                                    <div className="ai-msg-avatar bot">
                                        <Bot size={16} />
                                    </div>
                                    <div className="ai-msg-body">
                                        <div className="ai-bubble">
                                            <div className="ai-typing-indicator">
                                                <span className="ai-typing-dot" />
                                                <span className="ai-typing-dot" />
                                                <span className="ai-typing-dot" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                {/* Input Area */}
                <div className="ai-input-wrapper">
                    <div className="ai-input-box">
                        <textarea
                            ref={inputRef}
                            className="ai-input-textarea"
                            placeholder="Message LB Matchmaker AI… (Press Enter to send, Shift+Enter for newline)"
                            rows={1}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={sending}
                        />
                        <button
                            className="ai-send-btn"
                            onClick={() => handleSendMessage()}
                            disabled={!input.trim() || sending}
                            aria-label="Send message"
                        >
                            <Send size={15} />
                        </button>
                    </div>
                    <div className="ai-input-caption">
                        <span>LB Marriage Bureau AI Assistant</span>
                        <span>Private & secure workspace data</span>
                    </div>
                </div>
            </main>
        </div>
    );
}
export default AiChatPage;
