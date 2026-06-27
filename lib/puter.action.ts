import { puter } from "@heyputer/puter.js";
import { PUTER_WORKER_URL } from "./constants";

(puter as typeof puter & { quiet: boolean }).quiet = true;

const LOCAL_PROJECTS_KEY = "4wall_projects";

const readLocalProjects = (): DesignItem[] => {
    try {
        const stored = localStorage.getItem(LOCAL_PROJECTS_KEY);
        return stored ? (JSON.parse(stored) as DesignItem[]) : [];
    } catch {
        return [];
    }
};

const writeLocalProjects = (projects: DesignItem[]) => {
    localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(projects));
};

export const signIn = async () => await puter.auth.signIn();
export const signOut = async () => await puter.auth.signOut();

export const getCurrentUser = async () => {
    try {
        return await puter.auth.getUser();
    } catch {
        return null;
    }
};

export const createProject = async ({
    item,
    visibility = "private",
}: CreateProjectParams): Promise<DesignItem | null> => {
    if (PUTER_WORKER_URL) {
        try {
            const response = await puter.workers.exec(
                `${PUTER_WORKER_URL}/api/projects/save`,
                {
                    method: "POST",
                    body: JSON.stringify({ project: item, visibility }),
                },
            );

            if (!response.ok) {
                console.error("Failed to save project", await response.text());
                return null;
            }

            const data = (await response.json()) as { project?: DesignItem | null };
            return data?.project ?? null;
        } catch (error) {
            console.error("Failed to save project", error);
            return null;
        }
    }

    const saved: DesignItem = { ...item };
    const projects = readLocalProjects().filter((project) => project.id !== item.id);
    writeLocalProjects([saved, ...projects]);
    return saved;
};

export const getProjects = async (): Promise<DesignItem[]> => {
    if (PUTER_WORKER_URL) {
        try {
            const response = await puter.workers.exec(
                `${PUTER_WORKER_URL}/api/projects/list`,
                { method: "GET" },
            );

            if (!response.ok) {
                console.error("Failed to fetch projects", await response.text());
                return [];
            }

            const data = (await response.json()) as { projects?: DesignItem[] | null };
            return Array.isArray(data?.projects) ? data.projects : [];
        } catch (error) {
            console.error("Failed to get projects", error);
            return [];
        }
    }

    return readLocalProjects();
};

export const getProjectById = async ({ id }: { id: string }) => {
    if (PUTER_WORKER_URL) {
        try {
            const response = await puter.workers.exec(
                `${PUTER_WORKER_URL}/api/projects/get?id=${encodeURIComponent(id)}`,
                { method: "GET" },
            );

            if (!response.ok) {
                return null;
            }

            const data = (await response.json()) as { project?: DesignItem | null };
            return data?.project ?? null;
        } catch {
            return null;
        }
    }

    return readLocalProjects().find((project) => project.id === id) ?? null;
};
