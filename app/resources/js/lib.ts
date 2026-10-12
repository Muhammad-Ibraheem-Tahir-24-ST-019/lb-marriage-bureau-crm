export class ApiError extends Error {
    constructor(
        message: string,
        public status: number,
    ) {
        super(message);
    }
}
export async function api<T = any>(
    path: string,
    method = "GET",
    data?: unknown,
    retryCsrf = true,
): Promise<T> {
    const form = data instanceof FormData;
    // Laravel rotates this cookie when sessions change, including in other tabs.
    const cookieToken = document.cookie.split("; ").find((cookie) => cookie.startsWith("XSRF-TOKEN="));
    const csrfHeaders: Record<string, string> = cookieToken
        ? { "X-XSRF-TOKEN": decodeURIComponent(cookieToken.slice("XSRF-TOKEN=".length)) }
        : { "X-CSRF-TOKEN": document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || "" };
    const response = await fetch("/api" + path, {
        method,
        credentials: "same-origin",
        headers: {
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
            ...csrfHeaders,
            ...(!form ? { "Content-Type": "application/json" } : {}),
        },
        body:
            data === undefined
                ? undefined
                : form
                  ? (data as FormData)
                  : JSON.stringify(data),
    });
    // A 419 is rejected before the controller runs, so one retry is safe.
    if (response.status === 419 && retryCsrf) {
        const refresh = await fetch("/api/csrf-token", {
            credentials: "same-origin",
            cache: "no-store",
            headers: { Accept: "application/json" },
        });
        if (refresh.ok) {
            const { token } = await refresh.json();
            const meta = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]');
            if (meta) meta.content = token;
            return api<T>(path, method, data, false);
        }
    }
    const result = await response
        .json()
        .catch(() => ({
            message: "The server could not complete the request.",
        }));
    if (!response.ok) {
        const first = result.errors
            ? Object.values(result.errors).flat()[0]
            : null;
        throw new ApiError(
            String(
                first ||
                    result.message ||
                    "Something went wrong. Please try again.",
            ),
            response.status,
        );
    }
    return result;
}
export const initials = (name: string) =>
    name
        .split(" ")
        .slice(0, 2)
        .map((x) => x[0])
        .join("")
        .toUpperCase();
export const age = (dob: string) => {
    if (!dob) return "—";
    const now = new Date(),
        birth = new Date(dob);
    let n = now.getFullYear() - birth.getFullYear();
    if (
        now.getMonth() < birth.getMonth() ||
        (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
    )
        n--;
    return n;
};
export const date = (value: string, withTime = false) =>
    value
        ? new Date(value).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
          })
        : "—";
export const pid = (id: number) => `RH-${String(id).padStart(4, "0")}`;
export const isDone = (s: string) => ["Completed", "Cancelled"].includes(s);
export async function copy(text: string) {
    await navigator.clipboard.writeText(text);
}
