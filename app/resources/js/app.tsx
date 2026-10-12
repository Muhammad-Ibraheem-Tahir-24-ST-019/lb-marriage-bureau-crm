import React from "react";
import { createRoot } from "react-dom/client";
import { createInertiaApp } from "@inertiajs/react";
import { ToastProvider } from "./ui";
import { PasswordPage } from "./password";
import Workspace from "./workspace";
import { Auth, Family, Marketing, PublicBureau, Admin } from "./public";
import { AiChatPage } from "./ai-chat";
import { NotesPage } from "./notes";
import { TeamPage } from "./team";
import { AdminPage } from "./admin";
import type { Staff } from "./types";
class Boundary extends React.Component<
    React.PropsWithChildren,
    { failed: boolean }
> {
    state = { failed: false };
    static getDerivedStateFromError() {
        return { failed: true };
    }
    render() {
        return this.state.failed ? (
            <div className="fatal">
                <h1>Let’s get you back on track.</h1>
                <p>
                    The page encountered an unexpected error. Your saved records
                    are safe.
                </p>
                <button
                    className="btn btn-primary"
                    onClick={() => location.reload()}
                >
                    Reload page
                </button>
            </div>
        ) : (
            this.props.children
        );
    }
}
function App({
    user,
    demo,
    publicBureau,
}: {
    user: Staff | null;
    demo: boolean;
    publicBureau?: any;
}) {
    const path = location.pathname;
    return (
        <Boundary>
            <ToastProvider>
                {path === "/forgot-password" ||
                path.startsWith("/reset-password/") ? (
                    <PasswordPage />
                ) : publicBureau ? (
                    <PublicBureau bureau={publicBureau} />
                ) : path.startsWith("/share/") ? (
                    <Family token={path.split("/")[2]} />
                ) : path.startsWith("/invite/") ? (
                    <Auth invite={path.split("/")[2]} />
                ) : path === "/login" || path === "/register" ? (
                    <Auth register={path === "/register"} demo={demo} />
                ) : path.startsWith("/app") ? (
                    user ? (
                        user.role === "superadmin" ? (
                            <Admin />
                        ) : (
                            <Workspace demo={demo} />
                        )
                    ) : (
                        <Auth demo={demo} />
                    )
                ) : (
                    <Marketing user={user} />
                )}
            </ToastProvider>
        </Boundary>
    );
}
createInertiaApp({
    resolve: () => App,
    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },
    progress: { color: "#0f766e" },
});
