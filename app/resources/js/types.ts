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
};
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
