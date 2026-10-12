import { useState } from "react";
import { ArrowLeft, CheckCircle2, LockKeyhole } from "lucide-react";
import { Brand } from "./public";
import { Button, Card, Field, ErrorBox } from "./ui";
import { api } from "./lib";
export function PasswordPage() {
    const token = location.pathname.startsWith("/reset-password/")
        ? location.pathname.split("/")[2]
        : null;
    const [email, setEmail] = useState(
            new URLSearchParams(location.search).get("email") || "",
        ),
        [password, setPassword] = useState(""),
        [confirm, setConfirm] = useState(""),
        [busy, setBusy] = useState(false),
        [error, setError] = useState(""),
        [done, setDone] = useState("");
    return (
        <div className="family-page">
            <header>
                <Brand />
            </header>
            <main>
                <Card className="family-lock">
                    <LockKeyhole size={30} />
                    <h1>
                        {token
                            ? "Choose a new password"
                            : "Reset your password"}
                    </h1>
                    <p>
                        {token
                            ? "Use at least 12 characters, including letters and numbers."
                            : "We’ll email you a secure link to reset your password."}
                    </p>
                    {done ? (
                        <div className="notice">
                            <CheckCircle2 size={20} />
                            {done}
                        </div>
                    ) : (
                        <form
                            className="stack"
                            onSubmit={async (e) => {
                                e.preventDefault();
                                setBusy(true);
                                setError("");
                                try {
                                    const r = await api(
                                        token
                                            ? "/reset-password"
                                            : "/forgot-password",
                                        "POST",
                                        {
                                            email,
                                            password,
                                            password_confirmation: confirm,
                                            token,
                                        },
                                    );
                                    setDone(
                                        token
                                            ? "Your password has been reset. You can sign in now."
                                            : r.message,
                                    );
                                } catch (e: any) {
                                    setError(e.message);
                                } finally {
                                    setBusy(false);
                                }
                            }}
                        >
                            <ErrorBox message={error} />
                            <Field label="Email address">
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </Field>
                            {token && (
                                <>
                                    <Field label="New password">
                                        <input
                                            type="password"
                                            minLength={12}
                                            required
                                            value={password}
                                            onChange={(e) =>
                                                setPassword(e.target.value)
                                            }
                                        />
                                    </Field>
                                    <Field label="Confirm password">
                                        <input
                                            type="password"
                                            required
                                            value={confirm}
                                            onChange={(e) =>
                                                setConfirm(e.target.value)
                                            }
                                        />
                                    </Field>
                                </>
                            )}
                            <Button disabled={busy}>
                                {busy
                                    ? "Please wait…"
                                    : token
                                      ? "Reset password"
                                      : "Send reset link"}
                            </Button>
                        </form>
                    )}
                    <a href="/login" className="back-link mt-20">
                        <ArrowLeft size={14} />
                        Back to sign in
                    </a>
                </Card>
            </main>
        </div>
    );
}
