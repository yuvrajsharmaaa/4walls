import puter from "@heyputer/puter.js";
import {getOrCreateHostingConfig, uploadImageToHosting} from "./puter.hosting";
import {HOSTING_DOMAIN_SUFFIX, isHostedUrl} from "./utils";
import {PUTER_WORKER_URL} from "./constants";

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

export const signOut = () => puter.auth.signOut();

export const getCurrentUser = async () => {
    try {
        return await puter.auth.getUser();
    } catch {
        return null;
    }
}

export const createProject = async ({ item, visibility = "private" }: CreateProjectParams): Promise<DesignItem | null> => {
    const saveLocally = (project: DesignItem) => {
        const projects = readLocalProjects().filter((entry) => entry.id !== project.id);
        writeLocalProjects([project, ...projects]);
        return project;
    };

    if (!PUTER_WORKER_URL) {
        return saveLocally({ ...item });
    }

    const projectId = item.id;

    const hosting = await getOrCreateHostingConfig();

    const hostedSource = projectId ?
        await uploadImageToHosting({ hosting, url: item.sourceImage, projectId, label: 'source', }) : null;

    const hostedRender = projectId && item.renderedImage ?
        await uploadImageToHosting({ hosting, url: item.renderedImage, projectId, label: 'rendered', }) : null;

    let resolvedSource = hostedSource?.url ?? "";

    if (!resolvedSource && typeof item.sourceImage === "string") {
        if (
            item.sourceImage.includes(HOSTING_DOMAIN_SUFFIX) ||
            item.sourceImage.startsWith("data:")
        ) {
            resolvedSource = item.sourceImage;
        }
    }

    if (!resolvedSource) {
        console.warn("Failed to host source image, saving locally instead.");
        return saveLocally({ ...item });
    }

    const isHosted = isHostedUrl(item.renderedImage);
    const isDataUrl = typeof item.renderedImage === "string" && item.renderedImage.startsWith("data:");
    const resolvedRender = hostedRender?.url
        ? hostedRender.url
        : item.renderedImage && (isHosted || isDataUrl)
          ? item.renderedImage
          : undefined;

    const {
        sourcePath: _sourcePath,
        renderedPath: _renderedPath,
        publicPath: _publicPath,
        ...rest
    } = item;

    const payload = {
        ...rest,
        sourceImage: resolvedSource,
        renderedImage: resolvedRender,
    }

    try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/projects/save`, {
            method: 'POST',
            body: JSON.stringify({
                project: payload,
                visibility
            })
        });

        if(!response.ok) {
            console.error('failed to save the project', await response.text());
            return saveLocally(payload);
        }

        const data = (await response.json()) as { project?: DesignItem | null }

        return data?.project ?? saveLocally(payload);
    } catch (e) {
        console.log('Failed to save project', e)
        return saveLocally(payload);
    }
}

export const getProjects = async () => {
    const localProjects = readLocalProjects();

    if(!PUTER_WORKER_URL) {
        return localProjects;
    }

    try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/projects/list`, { method: 'GET' });

        if(!response.ok) {
            console.error('Failed to fetch history', await response.text());
            return localProjects;
        }

        const data = (await response.json()) as { projects?: DesignItem[] | null };
        const remoteProjects = Array.isArray(data?.projects) ? data.projects : [];

        const merged = new Map<string, DesignItem>();
        for (const project of [...remoteProjects, ...localProjects]) {
            merged.set(project.id, project);
        }

        return Array.from(merged.values());
    } catch (e) {
        console.error('Failed to get projects', e);
        return localProjects;
    }
}

export const getProjectById = async ({ id }: { id: string }) => {
    const localProject = readLocalProjects().find((project) => project.id === id) ?? null;

    if (!PUTER_WORKER_URL) {
        return localProject;
    }

    try {
        const response = await puter.workers.exec(
            `${PUTER_WORKER_URL}/api/projects/get?id=${encodeURIComponent(id)}`,
            { method: "GET" },
        );

        if (!response.ok) {
            console.error("Failed to fetch project:", await response.text());
            return localProject;
        }

        const data = (await response.json()) as {
            project?: DesignItem | null;
        };

        return data?.project ?? localProject;
    } catch (error) {
        console.error("Failed to fetch project:", error);
        return localProject;
    }
};

export const shareProject = async (projectId: string) => {
    if (!PUTER_WORKER_URL) return null;

    try {
        const response = await puter.workers.exec(
            `${PUTER_WORKER_URL}/api/projects/${encodeURIComponent(projectId)}/share`,
            { method: "POST" }
        );

        if (!response.ok) {
            console.error("Failed to share project:", await response.text());
            return null;
        }

        return (await response.json()) as { ok: boolean; action: string; projectId: string; visibility: string; project?: DesignItem };
    } catch (error) {
        console.error("Failed to share project:", error);
        return null;
    }
};

export const unshareProject = async (projectId: string) => {
    if (!PUTER_WORKER_URL) return null;

    try {
        const response = await puter.workers.exec(
            `${PUTER_WORKER_URL}/api/projects/${encodeURIComponent(projectId)}/unshare`,
            { method: "POST" }
        );

        if (!response.ok) {
            console.error("Failed to unshare project:", await response.text());
            return null;
        }

        return (await response.json()) as { ok: boolean; action: string; projectId: string; visibility: string; project?: DesignItem };
    } catch (error) {
        console.error("Failed to unshare project:", error);
        return null;
    }
};