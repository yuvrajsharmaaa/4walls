interface AuthState {
    isSignedIn: boolean;
    username: string | null,
    userId: string | null,
}

type AuthContext = {
    isSignedIn: boolean;
    username: string | null,
    userId: string | null,
    refreshAuth: () => Promise<boolean>;
    signOut: () => Promise<boolean>;
    signIn: () => Promise<boolean>;
}

interface DesignItem {
    id: string;
    name: string;
    sourceImage: string;
    renderedImage?: string;
    timestamp: number;
    isFeatured?: boolean;
}

interface CreateProjectParams {
    item: DesignItem;
    visibility?: "private" | "public";
}

interface UploadProps {
    onComplete: (base64File: string) => Promise<boolean | void>;
    className?: string;
}