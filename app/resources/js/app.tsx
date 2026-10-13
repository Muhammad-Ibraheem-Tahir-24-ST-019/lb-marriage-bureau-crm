import React from "react";
import { createRoot } from "react-dom/client";
import { createInertiaApp } from "@inertiajs/react";
import { ToastProvider } from "./ui";
import { PasswordPage } from "./password";
import Workspace from "./workspace";
import { Auth, Family } from "./public";
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
                ) : path.startsWith("/share/") ? (
                    <Family token={path.split("/")[2]} />
                ) : path.startsWith("/invite/") ? (
                    <Auth invite={path.split("/")[2]} />
                ) : user ? (
                    <Workspace demo={demo} />
                ) : (
                    <Auth demo={demo} />
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
