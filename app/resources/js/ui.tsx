import React, { createContext, useContext, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { X, CheckCircle2, AlertCircle, Loader2, Inbox } from "lucide-react";
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
const variants = cva("btn", {
    variants: {
        variant: {
            default: "btn-primary",
            outline: "btn-outline",
            ghost: "btn-ghost",
            danger: "btn-danger",
        },
        size: { default: "", sm: "btn-sm", icon: "btn-icon" },
    },
    defaultVariants: { variant: "default", size: "default" },
});
export function Button({
    className,
    variant,
    size,
    asChild = false,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> &
    VariantProps<typeof variants> & { asChild?: boolean }) {
    const C = asChild ? Slot : "button";
    return (
        <C className={cn(variants({ variant, size }), className)} {...props} />
    );
}
export function Field({
    label,
    children,
    hint,
}: React.PropsWithChildren<{ label: string; hint?: string }>) {
    return (
        <label className="field">
            <span>{label}</span>
            {children}
            {hint && <small>{hint}</small>}
        </label>
    );
}
export function Badge({
    children,
    tone,
}: React.PropsWithChildren<{ tone?: string }>) {
    const t =
        tone ||
        ([
            "Active",
            "Interested",
            "Completed",
            "Confirmed",
            "Matched",
            "Accepted",
        ].includes(String(children))
            ? "green"
            : [
                    "Pending",
                    "On Hold",
                    "Consider Later",
                    "Pending Review",
                    "Proposed",
                ].includes(String(children))
              ? "amber"
              : "neutral");
    return (
        <span className={"badge " + t}>
            <i />
            {children}
        </span>
    );
}
export function Modal({
    open,
    onClose,
    title,
    description,
    children,
    wide = false,
}: React.PropsWithChildren<{
    open: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    wide?: boolean;
}>) {
    return (
        <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content className={cn("dialog", wide && "dialog-wide")}>
                    <div className="dialog-heading">
                        <div>
                            <Dialog.Title>{title}</Dialog.Title>
                            <Dialog.Description>
                                {description || "Review the information below."}
                            </Dialog.Description>
                        </div>
                        <Dialog.Close asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Close dialog"
                            >
                                <X size={18} />
                            </Button>
                        </Dialog.Close>
                    </div>
                    {children}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
export function Empty({
    title = "Nothing here yet",
    text = "Start by adding your first record.",
    action,
}: {
    title?: string;
    text?: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="empty">
            <div className="empty-icon">
                <Inbox size={24} />
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
            {action}
        </div>
    );
}
export function Loading() {
    return (
        <div className="loading" role="status">
            <Loader2 className="spin" size={24} />
            <span>Loading your workspace…</span>
        </div>
    );
}
export function ErrorBox({ message }: { message: string }) {
    return message ? (
        <div className="error" role="alert">
            <AlertCircle size={16} />
            {message}
        </div>
    ) : null;
}
const ToastContext = createContext<(message: string, error?: boolean) => void>(
    () => {},
);
export const useToast = () => useContext(ToastContext);
export function ToastProvider({ children }: React.PropsWithChildren) {
    const [toast, setToast] = useState<{
        message: string;
        error: boolean;
    } | null>(null);
    const notify = (message: string, error = false) => {
        setToast({ message, error });
        setTimeout(
            () => setToast((x) => (x?.message === message ? null : x)),
            5000,
        );
    };
    return (
        <ToastContext.Provider value={notify}>
            {children}
            {toast && (
                <div
                    className={cn("toast", toast.error && "toast-error")}
                    role="status"
                >
                    {toast.error ? (
                        <AlertCircle size={18} />
                    ) : (
                        <CheckCircle2 size={18} />
                    )}
                    <span>{toast.message}</span>
                    <button
                        aria-label="Dismiss notification"
                        onClick={() => setToast(null)}
                    >
                        <X size={16} />
                    </button>
                </div>
            )}
        </ToastContext.Provider>
    );
}
export function PageHeading({
    eyebrow,
    title,
    description,
    children,
}: React.PropsWithChildren<{
    eyebrow?: string;
    title: string;
    description: string;
}>) {
    return (
        <div className="page-heading">
            <div>
                {eyebrow && <div className="eyebrow">{eyebrow}</div>}
                <h1>{title}</h1>
                <p>{description}</p>
            </div>
            <div className="heading-actions">{children}</div>
        </div>
    );
}
export function Card({
    title,
    description,
    action,
    children,
    className = "",
}: React.PropsWithChildren<{
    title?: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}>) {
    return (
        <section className={"card " + className}>
            {title && (
                <div className="card-heading">
                    <div>
                        <h2>{title}</h2>
                        {description && <p>{description}</p>}
                    </div>
                    {action}
                </div>
            )}
            {children}
        </section>
    );
}
