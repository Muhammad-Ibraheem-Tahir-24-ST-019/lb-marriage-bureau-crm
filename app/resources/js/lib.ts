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
    const cleanPath = path.startsWith("/api") ? path.slice(4) : path;
    const form = data instanceof FormData;
    // Laravel rotates this cookie when sessions change, including in other tabs.
    const cookieToken = document.cookie.split("; ").find((cookie) => cookie.startsWith("XSRF-TOKEN="));
    const csrfHeaders: Record<string, string> = cookieToken
        ? { "X-XSRF-TOKEN": decodeURIComponent(cookieToken.slice("XSRF-TOKEN=".length)) }
        : { "X-CSRF-TOKEN": document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || "" };
    const response = await fetch("/api" + cleanPath, {
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
            return api<T>(cleanPath, method, data, false);
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

api.get = <T = any>(path: string) => api<T>(path, "GET");
api.post = <T = any>(path: string, data?: unknown) => api<T>(path, "POST", data);
api.put = <T = any>(path: string, data?: unknown) => api<T>(path, "PUT", data);
api.delete = <T = any>(path: string) => api<T>(path, "DELETE");

export const initials = (name: string) =>
    name
        ? name
              .split(" ")
              .slice(0, 2)
              .map((x) => x[0])
              .join("")
              .toUpperCase()
        : "?";
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
export const timeAgo = (value: string) => {
    if (!value) return "—";
    const d = new Date(value);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};
export const pid = (id: number) => `LB-${String(id).padStart(4, "0")}`;
export const isDone = (s: string) => ["Completed", "Cancelled"].includes(s);
export async function copy(text: string) {
    await navigator.clipboard.writeText(text);
}

// AI API
export async function sendAiMessage(conversationId: number | null, message: string) {
    return api.post('/api/ai/chat', { conversation_id: conversationId, message });
}
export async function getAiConversations() {
    return api.get('/api/ai/conversations');
}
export async function getAiConversation(id: number) {
    return api.get(`/api/ai/conversations/${id}`);
}
export async function createAiConversation(title?: string, context?: string) {
    return api.post('/api/ai/conversations', { title, context });
}
export async function deleteAiConversation(id: number) {
    return api.delete(`/api/ai/conversations/${id}`);
}
export async function generateDailyReport() {
    return api.post('/api/ai/daily-report', {});
}
export async function getAiTaskLogs() {
    return api.get('/api/ai/task-logs');
}

// Admin API
export async function getAdminDashboard() {
    return api.get('/api/admin/dashboard');
}
export async function getAdminUsers() {
    return api.get('/api/admin/users');
}
export async function createAdminUser(data: any) {
    return api.post('/api/admin/users', data);
}
export async function updateAdminUser(id: number, data: any) {
    return api.put(`/api/admin/users/${id}`, data);
}
export async function deleteAdminUser(id: number) {
    return api.delete(`/api/admin/users/${id}`);
}
export async function resetUserPassword(id: number, password?: string) {
    return api.post(`/api/admin/users/${id}/reset-password`, { password });
}
export async function getAiSettings() {
    return api.get('/api/admin/ai-settings');
}
export async function updateAiSettings(data: any) {
    return api.put('/api/admin/ai-settings', data);
}

// Notes API
export async function getNotes(params?: any) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get(`/api/notes${query}`);
}
export async function createNote(data: any) {
    return api.post('/api/notes', data);
}
export async function updateNote(id: number, data: any) {
    return api.put(`/api/notes/${id}`, data);
}
export async function deleteNote(id: number) {
    return api.delete(`/api/notes/${id}`);
}

// Team API
export async function getTeamMessages(channel?: string) {
    const query = channel ? `?channel=${encodeURIComponent(channel)}` : '';
    return api.get(`/api/team/messages${query}`);
}
export async function sendTeamMessage(data: any) {
    return api.post('/api/team/messages', data);
}
export async function getTeamChannels() {
    return api.get('/api/team/channels');
}

// Notifications API
export async function getNotifications() {
    return api.get('/api/notifications');
}
export async function markNotificationRead(id: string) {
    return api.put(`/api/notifications/${id}/read`, {});
}
export async function markAllNotificationsRead() {
    return api.post('/api/notifications/read-all', {});
}
