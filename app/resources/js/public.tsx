import { useEffect, useState } from "react";
import {
    ArrowRight,
    ArrowUpRight,
    ShieldCheck,
    HeartHandshake,
    Users,
    Check,
    LockKeyhole,
    Mail,
    MapPin,
    Phone,
    Sun,
    Globe,
    Send,
    CheckCircle2,
    LogOut,
    Building2,
    CalendarClock,
    FileText,
    ChevronRight,
} from "lucide-react";
import {
    Button,
    Card,
    Field,
    ErrorBox,
    Loading,
    Empty,
    Badge,
    useToast,
} from "./ui";
import { api, ApiError, date, initials } from "./lib";
import type { Staff } from "./types";
export function Brand() {
    return (
        <a className="brand public-brand" href="/">
            <span className="brand-symbol">
                LB
            </span>
            <span>
                LB Marriage Bureau<span className="brand-dot">.</span>
            </span>
        </a>
    );
}
export function Auth({
    demo = false,
    invite,
}: {
    register?: boolean;
    demo?: boolean;
    invite?: string;
}) {
    const [form, setForm] = useState({
            name: "",
            email: "",
            password: "",
            password_confirmation: "",
        }),
        [busy, setBusy] = useState(false),
        [error, setError] = useState("");
    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
            await api(
                invite
                    ? "/invite/" + invite
                    : "/login",
                "POST",
                form,
            );
            location.assign("/app");
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };
    return (
        <div className="auth-layout">
            <div className="auth-aside">
                <Brand />
                <div className="auth-statement">
                    <div className="eyebrow">
                        LB MARRIAGE BUREAU CRM
                    </div>
                    <h1>
                        Dedicated Staff
                        <br />& Consultant
                        <br />
                        <em>Portal.</em>
                    </h1>
                    <p>
                        Internal workspace for candidate biodata,
                        <br />
                        matchmaking, and family proposals.
                    </p>
                    <div className="auth-art">
                        <div className="art-card">
                            <span className="avatar avatar-rose">LB</span>
                            <div>
                                <strong>LB Marriage Bureau</strong>
                                <small>Private Matrimonial CRM</small>
                            </div>
                            <CheckCircle2 size={22} />
                        </div>
                        <div className="art-line" />
                        <div className="art-note">
                            <HeartHandshake size={20} />
                            <span>Built for thoughtful introductions.</span>
                        </div>
                    </div>
                </div>
                <div className="auth-foot">
                    <ShieldCheck size={16} />
                    Private internal management system.
                </div>
            </div>
            <div className="auth-main">
                <div className="auth-form">
                    <div className="auth-mobile-brand">
                        <Brand />
                    </div>
                    <span className="square-icon">
                        <LockKeyhole size={21} />
                    </span>
                    <h1>
                        {invite
                            ? "Join LB Marriage Bureau"
                            : "Welcome back."}
                    </h1>
                    <p>
                        {invite
                            ? "Create your password to accept the staff invitation."
                            : "Sign in to the LB Marriage Bureau CRM."}
                    </p>
                    <form onSubmit={submit} className="stack">
                        <ErrorBox message={error} />
                        {invite && (
                            <Field label="Your full name">
                                <input
                                    autoComplete="name"
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
                        )}
                        {!invite && (
                            <Field label="Email address">
                                <input
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={form.email}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            email: e.target.value,
                                        })
                                    }
                                    placeholder="staff@lbmarriagebureau.com"
                                />
                            </Field>
                        )}
                        <Field
                            label="Password"
                            hint={
                                invite
                                    ? "At least 12 characters, including letters and numbers."
                                    : undefined
                            }
                        >
                            <input
                                type="password"
                                autoComplete={
                                    invite
                                        ? "new-password"
                                        : "current-password"
                                }
                                minLength={invite ? 12 : undefined}
                                required
                                value={form.password}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        password: e.target.value,
                                    })
                                }
                            />
                        </Field>
                        {invite && (
                            <Field label="Confirm password">
                                <input
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={form.password_confirmation}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            password_confirmation:
                                                e.target.value,
                                        })
                                    }
                                />
                            </Field>
                        )}
                        <Button type="submit" disabled={busy}>
                            {busy
                                ? "Please wait…"
                                : invite
                                  ? "Accept invitation"
                                  : "Sign in"}
                            <ArrowRight size={16} />
                        </Button>
                    </form>
                    {!invite && (
                        <a className="forgot-link" href="/forgot-password">
                            Forgot password?
                        </a>
                    )}
                    {demo && !invite && (
                        <div className="demo-login">
                            <Badge>Local demo</Badge>
                            <p>Explore with fictional profiles.</p>
                            <Button
                                variant="outline"
                                onClick={() =>
                                    setForm({
                                        ...form,
                                        email: "owner@demo.rishtahub.test",
                                        password: "DemoBureau2026!",
                                    })
                                }
                            >
                                Fill demo credentials
                            </Button>
                        </div>
                    )}
                    <div className="auth-legal">
                        By continuing, you acknowledge the{" "}
                        <a href="/terms">Terms</a> and{" "}
                        <a href="/privacy">Privacy information</a>.
                    </div>
                </div>
            </div>
        </div>
    );
}
export function Family({ token }: { token: string }) {
    const [data, setData] = useState<any>(null),
        [error, setError] = useState(""),
        [locked, setLocked] = useState(false),
        [password, setPassword] = useState(""),
        [busy, setBusy] = useState(false),
        [messages, setMessages] = useState<Record<number, string>>({}),
        [edit, setEdit] = useState<any>({}),
        [done, setDone] = useState(false);
    const toast = useToast();
    const load = () =>
        api("/share/" + token)
            .then((d) => {
                setData(d);
                setLocked(false);
                setError("");
                if (d.kind === "edit")
                    setEdit(
                        Object.fromEntries(
                            Object.entries(d.profiles[0] || {}).filter(([k]) =>
                                [
                                    "name",
                                    "city",
                                    "profession",
                                    "education",
                                    "phone",
                                ].includes(k),
                            ),
                        ),
                    );
            })
            .catch((e) => {
                if (e.status === 423) setLocked(true);
                else
                    setError(
                        e.status === 404
                            ? "This link has expired, was revoked, or is no longer available. Please contact your bureau."
                            : e.message,
                    );
            });
    useEffect(() => {
        load();
    }, [token]);
    const unlock = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            await api("/share/" + token + "/unlock", "POST", { password });
            await load();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };
    const respond = async (id: number, response: string) => {
        setBusy(true);
        try {
            await api("/share/" + token + "/respond", "POST", {
                profile_id: id,
                response,
                message: messages[id] || "",
            });
            await load();
            toast("Your response has been shared with the bureau");
        } catch (e: any) {
            toast(e.message, true);
        } finally {
            setBusy(false);
        }
    };
    return (
        <div className="family-page">
            <header>
                <Brand />
                <span>
                    <ShieldCheck size={15} />
                    Private family space
                </span>
            </header>
            <main>
                {locked ? (
                    <Card className="family-lock">
                        <LockKeyhole size={32} />
                        <h1>A private introduction.</h1>
                        <p>
                            Enter the password shared by your bureau to
                            continue.
                        </p>
                        <form onSubmit={unlock} className="stack">
                            <ErrorBox message={error} />
                            <Field label="Link password">
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                />
                            </Field>
                            <Button disabled={busy}>
                                View profiles
                                <ArrowRight size={16} />
                            </Button>
                        </form>
                    </Card>
                ) : error ? (
                    <Card>
                        <Empty title="This link is unavailable" text={error} />
                    </Card>
                ) : !data ? (
                    <Loading />
                ) : (
                    <>
                        <div className="family-heading">
                            <div className="eyebrow">
                                A PRIVATE INTRODUCTION FROM {data.bureau}
                            </div>
                            <h1>
                                {data.kind === "edit"
                                    ? "Your story, in your words."
                                    : "A few thoughtful possibilities."}
                            </h1>
                            <p>
                                {data.kind === "edit"
                                    ? "Review your details and send corrections to the bureau."
                                    : "Take your time. Review each profile and let your bureau know what you think."}
                            </p>
                            <span>
                                <LockKeyhole size={14} />
                                Private link · Available until{" "}
                                {date(data.expires_at)}
                            </span>
                        </div>
                        {data.kind === "edit" ? (
                            <Card
                                title="Review your biodata"
                                description="Changes are reviewed by your bureau before being applied."
                            >
                                <form
                                    className="dialog-body stack"
                                    onSubmit={async (e) => {
                                        e.preventDefault();
                                        setBusy(true);
                                        try {
                                            await api(
                                                "/share/" + token + "/edit",
                                                "POST",
                                                edit,
                                            );
                                            setDone(true);
                                        } catch (e: any) {
                                            toast(e.message, true);
                                        } finally {
                                            setBusy(false);
                                        }
                                    }}
                                >
                                    {done ? (
                                        <div className="notice">
                                            <CheckCircle2 size={20} />
                                            Your corrections were submitted for
                                            review. Thank you.
                                        </div>
                                    ) : (
                                        <>
                                            {Object.entries(edit).map(
                                                ([k, v]) => (
                                                    <Field
                                                        key={k}
                                                        label={
                                                            k[0].toUpperCase() +
                                                            k.slice(1)
                                                        }
                                                    >
                                                        <input
                                                            value={String(
                                                                v || "",
                                                            )}
                                                            onChange={(e) =>
                                                                setEdit({
                                                                    ...edit,
                                                                    [k]: e
                                                                        .target
                                                                        .value,
                                                                })
                                                            }
                                                        />
                                                    </Field>
                                                ),
                                            )}
                                            <Button disabled={busy}>
                                                Submit corrections
                                            </Button>
                                        </>
                                    )}
                                </form>
                            </Card>
                        ) : (
                            <div className="family-profiles">
                                {data.profiles.map((p: any) => (
                                    <Card className="family-profile" key={p.id}>
                                        <div className="family-profile-top">
                                            <span className="avatar hero-avatar">
                                                {initials(
                                                    p.name || "Private profile",
                                                )}
                                            </span>
                                            <div>
                                                <small>PROFILE #{p.id}</small>
                                                <h2>
                                                    {p.name ||
                                                        "Private profile"}
                                                </h2>
                                                <p>
                                                    {[
                                                        p.age
                                                            ? `${p.age} years`
                                                            : null,
                                                        p.city,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(" · ")}
                                                </p>
                                            </div>
                                        </div>
                                        {p.photos?.length > 0 && (
                                            <div className="family-photos">
                                                {p.photos.map(
                                                    (
                                                        url: string,
                                                        i: number,
                                                    ) => (
                                                        <div key={url}>
                                                            <img
                                                                src={url}
                                                                alt={`Profile photograph ${i + 1}`}
                                                            />
                                                            <span>
                                                                {data.bureau} ·
                                                                Private
                                                            </span>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                        <div className="biodata-grid">
                                            {Object.entries(p)
                                                .filter(
                                                    ([k, v]) =>
                                                        ![
                                                            "id",
                                                            "name",
                                                            "photos",
                                                            "response",
                                                            "family",
                                                            "preferences",
                                                        ].includes(k) && v,
                                                )
                                                .map(([k, v]) => (
                                                    <div key={k}>
                                                        <small>
                                                            {k.replaceAll(
                                                                "_",
                                                                " ",
                                                            )}
                                                        </small>
                                                        <strong>
                                                            {String(v)}
                                                        </strong>
                                                    </div>
                                                ))}
                                        </div>
                                        {p.family && (
                                            <div className="family-section">
                                                <h3>Family overview</h3>
                                                {Object.entries(p.family).map(
                                                    ([k, v]) => (
                                                        <p key={k}>
                                                            <span>
                                                                {k.replaceAll(
                                                                    "_",
                                                                    " ",
                                                                )}
                                                                :{" "}
                                                            </span>
                                                            {String(
                                                                v ||
                                                                    "Not specified",
                                                            )}
                                                        </p>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                        {p.preferences && (
                                            <div className="family-section">
                                                <h3>Partner preferences</h3>
                                                {Object.entries(
                                                    p.preferences,
                                                ).map(([k, v]) => (
                                                    <p key={k}>
                                                        <span>
                                                            {k.replaceAll(
                                                                "_",
                                                                " ",
                                                            )}
                                                            :{" "}
                                                        </span>
                                                        {String(
                                                            v ||
                                                                "No preference",
                                                        )}
                                                    </p>
                                                ))}
                                            </div>
                                        )}
                                        <div className="family-response">
                                            <h3>What are your thoughts?</h3>
                                            {p.response && (
                                                <p>
                                                    Your response:{" "}
                                                    <Badge>{p.response}</Badge>
                                                </p>
                                            )}
                                            <Field label="Message to the bureau (optional)">
                                                <textarea
                                                    value={messages[p.id] || ""}
                                                    onChange={(e) =>
                                                        setMessages({
                                                            ...messages,
                                                            [p.id]:
                                                                e.target.value,
                                                        })
                                                    }
                                                    placeholder="Anything you’d like the matchmaker to know…"
                                                />
                                            </Field>
                                            <div>
                                                <Button
                                                    disabled={busy}
                                                    onClick={() =>
                                                        respond(
                                                            p.id,
                                                            "Interested",
                                                        )
                                                    }
                                                >
                                                    <HeartHandshake size={16} />
                                                    Interested
                                                </Button>
                                                <Button
                                                    disabled={busy}
                                                    variant="outline"
                                                    onClick={() =>
                                                        respond(
                                                            p.id,
                                                            "Consider Later",
                                                        )
                                                    }
                                                >
                                                    Consider later
                                                </Button>
                                                <Button
                                                    disabled={busy}
                                                    variant="ghost"
                                                    onClick={() =>
                                                        respond(
                                                            p.id,
                                                            "Not Interested",
                                                        )
                                                    }
                                                >
                                                    Not interested
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>
            <footer>
                <ShieldCheck size={16} />
                Shared with care. Please respect the privacy of these families.
                <span>Powered by LB Marriage Bureau</span>
            </footer>
        </div>
    );
}
export function Marketing({ user }: { user: Staff | null }) {
    const path = location.pathname;
    const legal = path === "/privacy" || path === "/terms";
    const [submitted, setSubmitted] = useState(false),
        [error, setError] = useState(""),
        [busy, setBusy] = useState(false);
    return (
        <div className="marketing">
            <header className="marketing-header">
                <Brand />
                <nav>
                    <a href="/#features">Features</a>
                    <a href="/#how-it-works">How it works</a>
                    <a href="/#privacy">Privacy</a>
                    <a href="/#contact">Contact</a>
                </nav>
                <div>
                    <Button variant="ghost" asChild>
                        <a href={user ? "/app" : "/login"}>
                            {user ? "Workspace" : "Sign in"}
                        </a>
                    </Button>
                    <Button asChild>
                        <a href="/register">
                            Create your bureau account
                            <ArrowUpRight size={15} />
                        </a>
                    </Button>
                </div>
            </header>
            {legal ? (
                <main className="legal-page">
                    <div className="eyebrow">LB MARRIAGE BUREAU</div>
                    <h1>
                        {path === "/privacy"
                            ? "Privacy information"
                            : "Terms of use"}
                    </h1>
                    <p className="notice">
                        Deployment draft: the operator must add their legal
                        identity, contact details, retention periods, and
                        applicable terms before a public launch.
                    </p>
                    {(path === "/privacy"
                        ? [
                              [
                                  "What the workspace stores",
                                  "Your bureau stores account details, biodata, family information, uploaded files, consent records, and an audit trail. These records are used to provide the matchmaking workflow.",
                              ],
                              [
                                  "Who can access records",
                                  "Authorized bureau staff can access their bureau’s records. Family links return only selected fields. Network discovery is optional and limited to minimal attributes.",
                              ],
                              [
                                  "Your choices",
                                  "Contact your bureau to request correction, export, or deletion of your information. A bureau can revoke sharing links at any time.",
                              ],
                              [
                                  "External services",
                                  "AI and messaging services require separate operator configuration. Review their data-processing terms before sending personal information.",
                              ],
                          ]
                        : [
                              [
                                  "Responsible use",
                                  "Use the workspace only for consented adult matchmaking. Keep biodata accurate and respect each person’s privacy and decisions.",
                              ],
                              [
                                  "Account security",
                                  "Protect credentials and invitation links. Bureau owners are responsible for assigning appropriate staff access and keeping their team membership current.",
                              ],
                              [
                                  "Matching suggestions",
                                  "Compatibility scores summarize recorded preferences. They do not verify a person’s identity or guarantee a relationship outcome.",
                              ],
                              [
                                  "Service operation",
                                  "The operator must publish their support contact, subscription terms, cancellation policy, and relevant legal terms before accepting paying customers.",
                              ],
                          ]
                    ).map(([h, t]) => (
                        <section key={h}>
                            <h2>{h}</h2>
                            <p>{t}</p>
                        </section>
                    ))}
                </main>
            ) : (
                <>
                    <section className="hero">
                        <div className="hero-kicker">
                            <span />A DEDICATED WORKSPACE FOR LB MARRIAGE BUREAU
                        </div>
                        <h1>
                            Modern tools.
                            <br />
                            <span>Meaningful connections.</span>
                        </h1>
                        <p>
                            Less paperwork. More thoughtful introductions.
                            <br />
                            Bring your profiles, proposals, and family
                            conversations together.
                        </p>
                        <div className="hero-actions">
                            <Button asChild>
                                <a href="/register">
                                    Start your bureau workspace
                                    <ArrowRight size={17} />
                                </a>
                            </Button>
                            <Button variant="outline" asChild>
                                <a href="#how-it-works">See how it works</a>
                            </Button>
                        </div>
                        <div className="hero-trust">
                            <span>
                                <Check size={14} />
                                Private by default
                            </span>
                            <span>
                                <Check size={14} />
                                Built for matchmakers
                            </span>
                            <span>
                                <Check size={14} />
                                Your bureau, your brand
                            </span>
                        </div>
                        <div className="marketing-preview">
                            <div className="preview-sidebar">
                                <div className="mini-brand">LB.</div>
                                {[
                                    "Overview",
                                    "Profiles",
                                    "Matching",
                                    "Proposals",
                                    "Follow-ups",
                                ].map((s, i) => (
                                    <div
                                        key={s}
                                        className={i === 0 ? "active" : ""}
                                    >
                                        {s}
                                    </div>
                                ))}
                            </div>
                            <div className="preview-content">
                                <div className="eyebrow">
                                    YOUR BUREAU, BEAUTIFULLY ORGANIZED
                                </div>
                                <h3>A place for every possibility.</h3>
                                <div className="preview-cards">
                                    {[
                                        [
                                            Users,
                                            "Profiles",
                                            "Every story, in one place",
                                        ],
                                        [
                                            HeartHandshake,
                                            "Matching",
                                            "Thoughtful suggestions",
                                        ],
                                        [Send, "Proposals", "Shared with care"],
                                    ].map(([Icon, l, t]: any) => (
                                        <div key={l}>
                                            <Icon size={20} />
                                            <strong>{l}</strong>
                                            <small>{t}</small>
                                        </div>
                                    ))}
                                </div>
                                <div className="preview-flow">
                                    <span>
                                        <CheckCircle2 size={18} />
                                        Profile created
                                    </span>
                                    <ChevronRight size={16} />
                                    <span>Match shortlisted</span>
                                    <ChevronRight size={16} />
                                    <span>
                                        Family interested
                                        <HeartHandshake size={17} />
                                    </span>
                                </div>
                            </div>
                        </div>
                    </section>
                    <section id="features" className="marketing-section">
                        <div className="eyebrow">MADE FOR THE WAY YOU WORK</div>
                        <h2>Everything in its right place.</h2>
                        <p>
                            A calmer, clearer way to manage your marriage
                            bureau.
                        </p>
                        <div className="feature-grid">
                            {[
                                [
                                    Users,
                                    "A thoughtful profile directory",
                                    "Organize biodata, family details, photos, and preferences in a searchable private directory.",
                                ],
                                [
                                    HeartHandshake,
                                    "Matching you can explain",
                                    "Understand why a profile fits, compare candidates, and build considered shortlists.",
                                ],
                                [
                                    LockKeyhole,
                                    "Private proposal sharing",
                                    "Choose visible details, add an expiry, and revoke access whenever you need.",
                                ],
                                [
                                    CalendarClock,
                                    "Follow-ups that follow through",
                                    "Track calls, family responses, meetings, and the next step for your team.",
                                ],
                                [
                                    ShieldCheck,
                                    "A workspace built on trust",
                                    "Separate bureau records, role-based access, consent, and an activity trail.",
                                ],
                                [
                                    Globe,
                                    "A considered bureau network",
                                    "Discover anonymous availability and request introductions with permission.",
                                ],
                            ].map(([Icon, t, d]: any) => (
                                <article key={t}>
                                    <Icon size={24} />
                                    <h3>{t}</h3>
                                    <p>{d}</p>
                                </article>
                            ))}
                        </div>
                    </section>
                    <section
                        id="how-it-works"
                        className="marketing-section steps-section"
                    >
                        <div className="eyebrow">A SIMPLE, HUMAN WORKFLOW</div>
                        <h2>From profile to possibility.</h2>
                        <div className="steps-grid">
                            {[
                                [
                                    "01",
                                    "Build the story",
                                    "Add a complete, consented profile and partner preferences.",
                                ],
                                [
                                    "02",
                                    "Find a connection",
                                    "Review suggestions and select thoughtful proposals.",
                                ],
                                [
                                    "03",
                                    "Bring families together",
                                    "Share privately, listen to feedback, and plan the next conversation.",
                                ],
                            ].map(([n, t, d]) => (
                                <div key={n}>
                                    <span>{n}</span>
                                    <h3>{t}</h3>
                                    <p>{d}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                    <section id="privacy" className="privacy-section">
                        <ShieldCheck size={42} />
                        <div>
                            <div className="eyebrow">
                                TRUST IS THE FOUNDATION
                            </div>
                            <h2>
                                Private by default.
                                <br />
                                Shared with intention.
                            </h2>
                            <p>
                                Your directory is not a public matrimonial
                                listing. You decide what to share, with whom,
                                and for how long.
                            </p>
                            <a href="/privacy">
                                Read about privacy
                                <ArrowUpRight size={15} />
                            </a>
                        </div>
                    </section>
                    <section
                        id="contact"
                        className="marketing-section contact-section"
                    >
                        <div>
                            <div className="eyebrow">LET’S TALK</div>
                            <h2>
                                Your bureau.
                                <br />
                                Your next chapter.
                            </h2>
                            <p>
                                Ask about a demonstration, deployment, or a plan
                                for your team.
                            </p>
                            <div className="contact-note">
                                <Building2 size={20} />
                                <span>
                                    Plans can be tailored to your bureau.
                                    <br />
                                    No payment details needed to get in touch.
                                </span>
                            </div>
                        </div>
                        <Card>
                            <form
                                className="dialog-body stack"
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    setBusy(true);
                                    setError("");
                                    const f = new FormData(e.currentTarget);
                                    try {
                                        await api(
                                            "/contact",
                                            "POST",
                                            Object.fromEntries(f),
                                        );
                                        setSubmitted(true);
                                    } catch (e: any) {
                                        setError(e.message);
                                    } finally {
                                        setBusy(false);
                                    }
                                }}
                            >
                                {submitted ? (
                                    <div className="empty">
                                        <CheckCircle2 size={30} />
                                        <h3>Thank you for reaching out.</h3>
                                        <p>
                                            Your inquiry has been recorded for
                                            the platform team.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <h3>Tell us about your bureau</h3>
                                        <ErrorBox message={error} />
                                        <Field label="Your name">
                                            <input name="name" required />
                                        </Field>
                                        <Field label="Email address">
                                            <input
                                                name="email"
                                                type="email"
                                                required
                                            />
                                        </Field>
                                        <Field label="Message">
                                            <textarea
                                                name="message"
                                                required
                                                rows={3}
                                            />
                                        </Field>
                                        <Button disabled={busy}>
                                            {busy
                                                ? "Sending…"
                                                : "Request a conversation"}
                                            <ArrowRight size={15} />
                                        </Button>
                                    </>
                                )}
                            </form>
                        </Card>
                    </section>
                </>
            )}
            <footer className="marketing-footer">
                <Brand />
                <span>Thoughtful tools. Meaningful connections.</span>
                <div>
                    <a href="/terms">Terms</a>
                    <a href="/privacy">Privacy</a>
                </div>
            </footer>
        </div>
    );
}
export function PublicBureau({ bureau }: { bureau: any }) {
    return (
        <div className="bureau-public">
            <Brand />
            <main>
                <span className="square-icon">
                    <Building2 size={30} />
                </span>
                <div className="eyebrow">
                    TRUSTED CONNECTIONS BEGIN WITH A CONVERSATION
                </div>
                <h1>{bureau.name}</h1>
                <p>
                    {bureau.settings.about ||
                        "A private, personal approach to thoughtful matchmaking."}
                </p>
                <div className="bureau-contact">
                    {bureau.settings.city && (
                        <span>
                            <MapPin size={17} />
                            {bureau.settings.city}
                        </span>
                    )}
                    {bureau.settings.phone && (
                        <span>
                            <Phone size={17} />
                            {bureau.settings.phone}
                        </span>
                    )}
                    {bureau.settings.website && (
                        <a
                            href={bureau.settings.website}
                            rel="noreferrer"
                            target="_blank"
                        >
                            Visit website
                            <ArrowUpRight size={16} />
                        </a>
                    )}
                </div>
                <div className="notice">
                    <ShieldCheck size={22} />
                    Profiles are managed privately. Contact the bureau directly
                    to discuss an introduction.
                </div>
            </main>
            <footer>LB Marriage Bureau · Private by design</footer>
        </div>
    );
}
export function Admin() {
    const [data, setData] = useState<any>(null),
        [error, setError] = useState("");
    const toast = useToast();
    const load = () =>
        api("/admin")
            .then(setData)
            .catch((e) => setError(e.message));
    useEffect(() => {
        load();
    }, []);
    return (
        <div className="admin-page">
            <header>
                <Brand />
                <Button
                    variant="outline"
                    onClick={async () => {
                        await api("/logout", "POST");
                        location.assign("/login");
                    }}
                >
                    <LogOut size={15} />
                    Sign out
                </Button>
            </header>
            <main>
                <h1>Platform administration</h1>
                <p className="muted">
                    Manage bureau access without opening private profile
                    records.
                </p>
                <ErrorBox message={error} />
                {!data ? (
                    <Loading />
                ) : (
                    <>
                        <div className="mini-stats">
                            <div>
                                <span>Bureaus</span>
                                <strong>{data.bureaus.length}</strong>
                            </div>
                            <div>
                                <span>Profiles (aggregate only)</span>
                                <strong>{data.counts.profiles}</strong>
                            </div>
                            <div>
                                <span>Accounts</span>
                                <strong>{data.counts.users}</strong>
                            </div>
                        </div>
                        <Card title="Bureaus">
                            {data.bureaus.map((b: any) => (
                                <div className="simple-row" key={b.id}>
                                    <span>
                                        <strong>{b.name}</strong>
                                        <small>{date(b.created_at)}</small>
                                    </span>
                                    <Badge>{b.status}</Badge>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={async () => {
                                            try {
                                                await api(
                                                    "/admin/" + b.id,
                                                    "PUT",
                                                    {
                                                        status:
                                                            b.status ===
                                                            "active"
                                                                ? "suspended"
                                                                : "active",
                                                    },
                                                );
                                                await load();
                                                toast("Bureau access updated");
                                            } catch (e: any) {
                                                toast(e.message, true);
                                            }
                                        }}
                                    >
                                        {b.status === "active"
                                            ? "Suspend"
                                            : "Reactivate"}
                                    </Button>
                                </div>
                            ))}
                        </Card>
                        {data.inquiries?.length > 0 && (
                            <Card
                                title="Demo and contact inquiries"
                                className="mt-20"
                            >
                                {data.inquiries.map((i: any) => (
                                    <div className="simple-row" key={i.id}>
                                        <span>
                                            <strong>
                                                {i.name} · {i.email}
                                            </strong>
                                            <p>{i.message}</p>
                                            <small>{date(i.created_at)}</small>
                                        </span>
                                    </div>
                                ))}
                            </Card>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
