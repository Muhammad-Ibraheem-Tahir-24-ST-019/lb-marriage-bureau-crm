export type Profile = {
    id: number;
    name: string;
    gender: string;
    dob: string;
    city: string;
    country: string;
    profession: string;
    education: string;
    status: string;
    marital_status: string;
    religion: string;
    sect: string;
    phone?: string;
    notes?: string;
    tags: string[];
    details?: Record<string, string>;
    preferences: Record<string, string | number>;
    consented_at?: string;
    created_at: string;
    updated_at: string;
    files?: { id: number; name: string; kind: string; mime: string }[];
    links?: Share[];
};
export type Staff = {
    id: number;
    name: string;
    email: string;
    role: string;
    active: boolean;
    can_use_ai?: boolean;
    phone?: string;
    last_login_at?: string;
};
export type User = Staff;
export type Share = {
    id: number;
    expires_at: string;
    revoked_at: string | null;
    views: number;
    photos: boolean;
    fields: string[];
};
export type Proposal = {
    id: number;
    title: string;
    profile_id: number;
    status: string;
    notes: string;
    candidates: {
        id: number;
        profile_id: number;
        response: string | null;
        message: string | null;
    }[];
    links: Share[];
    created_at: string;
};
export type Work = {
    id: number;
    kind: string;
    title: string;
    profile_id: number | null;
    assigned_to: number | null;
    type: string;
    status: string;
    due_at: string;
    location: string;
    notes: string;
};
export type Bureau = {
    id: number;
    name: string;
    slug: string;
    settings: {
        accent: string;
        network: boolean;
        about?: string;
        city?: string;
        address?: string;
        phone?: string;
        website?: string;
        weights?: Record<string, number>;
        templates?: string;
    };
};
export type State = {
    user: Staff;
    bureau: Bureau;
    profiles: Profile[];
    proposals: Proposal[];
    work: Work[];
    staff: Staff[];
    activities: {
        id: number;
        profile_id: number | null;
        action: string;
        description: string;
        created_at: string;
    }[];
    edits: { id: number; profile_id: number; data: string }[];
    archived: { id: number; name: string; city: string; deleted_at: string }[];
};
export type Match = {
    profile: Profile;
    score: number | null;
    reasons: {
        label: string;
        matched: boolean;
        unknown: boolean;
        weight: number;
    }[];
    decision: string | null;
    note: string | null;
};

// AI Types
export interface AiConversation {
    id: number;
    user_id: number;
    title: string;
    context: 'general' | 'report' | 'task' | 'crm_query';
    is_pinned: boolean;
    created_at: string;
    updated_at: string;
    messages_count?: number;
    last_message?: AiMessage;
}

export interface AiMessage {
    id: number;
    conversation_id: number;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string | null;
    tool_calls: AiToolCall[] | null;
    tool_results: any[] | null;
    tokens_used: number | null;
    model_used: string | null;
    created_at: string;
}

export interface AiToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

export interface AiSettings {
    id: number;
    provider: 'openai' | 'anthropic' | 'ollama' | 'custom';
    api_key_last4: string;
    api_url: string | null;
    model: string;
    is_active: boolean;
    max_tokens: number;
    temperature: number;
}

export interface AiTaskLog {
    id: number;
    user_id: number;
    action: string;
    description: string;
    status: 'success' | 'failed' | 'pending';
    created_at: string;
    user?: User;
}

// Notes Types
export interface Note {
    id: number;
    user_id: number;
    profile_id: number | null;
    title: string;
    content: string;
    is_shared: boolean;
    color: string | null;
    is_pinned: boolean;
    created_at: string;
    updated_at: string;
    user?: User;
    profile?: Profile;
}

// Team Types
export interface TeamMessage {
    id: number;
    user_id: number;
    channel: string;
    content: string;
    reply_to: number | null;
    is_announcement: boolean;
    created_at: string;
    updated_at: string;
    user?: User;
    replies?: TeamMessage[];
}

export interface TeamChannel {
    name: string;
    message_count: number;
    last_message_at: string | null;
}

// Notification Type
export interface AppNotification {
    id: string;
    user_id: number;
    type: string;
    title: string;
    body: string;
    data: any;
    read_at: string | null;
    created_at: string;
}

// Admin Types
export interface AdminDashboard {
    user_count: number;
    active_users: number;
    ai_enabled_users: number;
    profiles_total: number;
    proposals_total: number;
    tasks_total: number;
    recent_activity: any[];
}

