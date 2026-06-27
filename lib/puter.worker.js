const PROJECT_PREFIX = 'roomify_project_';

const jsonResponse = (status, data) => {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
};

const jsonError = (status, message, extra = {}) => {
    return jsonResponse(status, { error: message, ...extra });
};

const getUserInfo = async (userPuter) => {
    try {
        const user = await userPuter.auth.getUser();
        if (!user) return null;
        return {
            userId: user.id || user.uuid || null,
            username: user.username || null
        };
    } catch {
        return null;
    }
};

const getUserId = async (userPuter) => {
    const info = await getUserInfo(userPuter);
    return info?.userId || null;
};

const getProjectId = async (request, params) => {
    if (params && params.projectId) return params.projectId;

    try {
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/');
        // e.g., /api/projects/123/share -> ["", "api", "projects", "123", "share"]
        if (pathParts.length >= 5 && pathParts[1] === 'api' && pathParts[2] === 'projects') {
            const id = pathParts[3];
            if (id && id !== 'share' && id !== 'unshare') {
                return id;
            }
        }

        const searchId = url.searchParams.get('id') || url.searchParams.get('projectId');
        if (searchId) return searchId;
    } catch (e) {
        // ignore
    }

    try {
        const clone = request.clone();
        const body = await clone.json();
        return body?.projectId || body?.id || body?.project?.id;
    } catch (e) {
        // ignore
    }

    return null;
};

// Abstract KV operations to handle both Puter KV and Cloudflare Workers KV shapes
const kvGet = async (kv, key) => {
    if (typeof kv.getWithMetadata === 'function') {
        const result = await kv.getWithMetadata(key);
        if (!result || !result.value) return null;
        const value = typeof result.value === 'string' ? JSON.parse(result.value) : result.value;
        return { value, metadata: result.metadata };
    } else if (typeof kv.get === 'function') {
        const val = await kv.get(key);
        if (!val) return null;
        const value = typeof val === 'string' ? JSON.parse(val) : val;
        const metadata = value.metadata || {
            userId: value.ownerId,
            username: value.sharedBy,
            sharedAt: value.sharedAt,
            originalProjectId: value.id,
            visibility: value.isPublic ? "public" : "private"
        };
        return { value, metadata };
    }
    return null;
};

const kvSet = async (kv, key, value, metadata) => {
    if (typeof kv.put === 'function') {
        await kv.put(key, JSON.stringify(value), { metadata });
        return true;
    } else if (typeof kv.set === 'function') {
        const enrichedValue = { ...value, metadata };
        await kv.set(key, enrichedValue);
        return true;
    }
    return false;
};

const kvDelete = async (kv, key) => {
    if (typeof kv.delete === 'function') {
        await kv.delete(key);
        return true;
    } else if (typeof kv.del === 'function') {
        await kv.del(key);
        return true;
    }
    return false;
};

router.post('/api/projects/save', async ({ request, user }) => {
    try {
        const userPuter = user?.puter;
        if(!userPuter) return jsonError(401, 'Authentication failed');

        const body = await request.json();
        const project = body?.project;

        if(!project?.id || !project?.sourceImage) return jsonError(400, 'Project ID and source image are required');

        const userInfo = await getUserInfo(userPuter);
        if(!userInfo || !userInfo.userId) return jsonError(401, 'Authentication failed');
        const { userId } = userInfo;

        const payload = {
            ...project,
            ownerId: userId,
            updatedAt: new Date().toISOString(),
        }

        const key = `user:${userId}:project:${project.id}`;
        await userPuter.kv.set(key, payload);

        return { saved: true, id: project.id, project: payload }
    } catch (e) {
        return jsonError(500, 'Failed to save project', { message: e.message || 'Unknown error' });
    }
})

router.get('/api/projects/list', async ({ user }) => {
    try {
        const userPuter = user?.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const userInfo = await getUserInfo(userPuter);
        if (!userInfo || !userInfo.userId) return jsonError(401, 'Authentication failed');
        const { userId } = userInfo;

        const projects = [];

        // 1. Fetch user's private projects with new prefix
        try {
            const privateListNew = await userPuter.kv.list(`user:${userId}:project:`, true);
            if (privateListNew) {
                for (const item of privateListNew) {
                    if (item.value) {
                        const val = typeof item.value === 'string' ? JSON.parse(item.value) : item.value;
                        projects.push({ ...val, isPublic: false });
                    }
                }
            }
        } catch (err) {
            console.warn(`Error listing user private projects (new prefix): ${err.message}`);
        }

        // 2. Fetch user's private projects with old prefix
        try {
            const privateListOld = await userPuter.kv.list(PROJECT_PREFIX, true);
            if (privateListOld) {
                for (const item of privateListOld) {
                    if (item.value) {
                        const val = typeof item.value === 'string' ? JSON.parse(item.value) : item.value;
                        projects.push({ ...val, isPublic: false });
                    }
                }
            }
        } catch (err) {
            console.warn(`Error listing user private projects (old prefix): ${err.message}`);
        }

        // 3. Fetch public shared projects belonging to the user
        try {
            if (me.puter.kv && typeof me.puter.kv.list === 'function') {
                const publicList = await me.puter.kv.list('project:*', true);
                if (publicList) {
                    for (const item of publicList) {
                        if (item.value) {
                            const val = typeof item.value === 'string' ? JSON.parse(item.value) : item.value;
                            const ownerId = item.metadata?.userId || val.ownerId || val.metadata?.userId;
                            if (ownerId === userId) {
                                projects.push({
                                    ...val,
                                    isPublic: true,
                                    sharedBy: item.metadata?.username || val.sharedBy,
                                    sharedAt: item.metadata?.sharedAt || val.sharedAt
                                });
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.warn(`Error listing public projects for list: ${err.message}`);
        }

        // De-duplicate projects by ID to be perfectly safe
        const uniqueProjectsMap = new Map();
        for (const p of projects) {
            uniqueProjectsMap.set(p.id, p);
        }

        return { projects: Array.from(uniqueProjectsMap.values()) };
    } catch (e) {
        return jsonError(500, 'Failed to list projects', { message: e.message || 'Unknown error' });
    }
})

router.get('/api/projects/get', async ({ request, user }) => {
    try {
        const url = new URL(request.url);
        const id = url.searchParams.get('id');

        if (!id) return jsonError(400, 'Project ID is required');

        let project = null;
        let userId = null;

        const userPuter = user?.puter;
        if (userPuter) {
            const userInfo = await getUserInfo(userPuter);
            userId = userInfo?.userId;
            if (userId) {
                // Try private KV namespaces
                const keyNew = `user:${userId}:project:${id}`;
                const keyOld = `${PROJECT_PREFIX}${id}`;
                project = await userPuter.kv.get(keyNew);
                if (!project) {
                    project = await userPuter.kv.get(keyOld);
                }
            }
        }

        // Try public KV namespace
        if (!project) {
            const publicKey = `project:${id}`;
            const publicRecord = await kvGet(me.puter.kv, publicKey);
            if (publicRecord) {
                project = publicRecord.value;
            }
        }

        if (!project) return jsonError(404, 'Project not found');

        return { project };
    } catch (e) {
        return jsonError(500, 'Failed to get project', { message: e.message || 'Unknown error' });
    }
})

const handleShare = async ({ request, user, params }) => {
    try {
        const userPuter = user?.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const userInfo = await getUserInfo(userPuter);
        if (!userInfo || !userInfo.userId) return jsonError(401, 'Authentication failed');
        const { userId, username } = userInfo;

        const projectId = await getProjectId(request, params);
        if (!projectId) return jsonError(400, 'Project ID is required');

        const privateKeyNew = `user:${userId}:project:${projectId}`;
        const privateKeyOld = `${PROJECT_PREFIX}${projectId}`;
        const publicKey = `project:${projectId}`;

        let project = await userPuter.kv.get(privateKeyNew);
        let usedKey = privateKeyNew;

        if (!project) {
            project = await userPuter.kv.get(privateKeyOld);
            usedKey = privateKeyOld;
        }

        // Check if project exists in private KV
        if (!project) {
            // Check if already shared in public namespace
            const publicRecord = await kvGet(me.puter.kv, publicKey);
            if (publicRecord) {
                const pubProj = publicRecord.value;
                const ownerId = publicRecord.metadata?.userId || pubProj?.ownerId || pubProj?.metadata?.userId;
                if (ownerId === userId) {
                    console.log(`Sharing project ${projectId}: already shared by user`);
                    return jsonResponse(200, {
                        ok: true,
                        action: "share",
                        projectId,
                        visibility: "public",
                        message: "Project is already shared"
                    });
                } else {
                    return jsonError(403, 'Unauthorized: You do not own this project');
                }
            }
            return jsonError(404, 'Project not found');
        }

        // Validate ownership
        if (project.ownerId && project.ownerId !== userId) {
            return jsonError(403, 'Unauthorized: You do not own this project');
        }

        // Ensure ownerId is set
        project.ownerId = userId;

        // Prepare public project data
        const sharedAt = new Date().toISOString();
        const publicProject = {
            ...project,
            isPublic: true,
            sharedBy: username,
            sharedAt: sharedAt,
            ownerId: userId
        };

        const metadata = {
            userId,
            username,
            sharedAt,
            originalProjectId: projectId,
            visibility: "public"
        };

        console.log(`Sharing project ${projectId}: copying to public KV...`);
        const setOk = await kvSet(me.puter.kv, publicKey, publicProject, metadata);
        if (!setOk) {
            throw new Error("Failed to write to public KV");
        }
        console.log("Sharing project: copy to public KV successful");

        console.log(`Sharing project ${projectId}: deleting private copy...`);
        await kvDelete(userPuter.kv, usedKey);
        console.log("Sharing project: deleted private copy");

        return jsonResponse(200, {
            ok: true,
            action: "share",
            projectId,
            visibility: "public",
            project: publicProject,
            metadata
        });

    } catch (e) {
        console.error(`Error sharing project: ${e.message}`, e);
        return jsonError(500, 'Failed to share project', { message: e.message || 'Unknown error' });
    }
};

const handleUnshare = async ({ request, user, params }) => {
    try {
        const userPuter = user?.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const userInfo = await getUserInfo(userPuter);
        if (!userInfo || !userInfo.userId) return jsonError(401, 'Authentication failed');
        const { userId } = userInfo;

        const projectId = await getProjectId(request, params);
        if (!projectId) return jsonError(400, 'Project ID is required');

        const publicKey = `project:${projectId}`;
        const privateKey = `user:${userId}:project:${projectId}`;

        // Load project from public KV
        const publicRecord = await kvGet(me.puter.kv, publicKey);
        if (!publicRecord) {
            // Check if already in private namespace (already private)
            const privateKeyOld = `${PROJECT_PREFIX}${projectId}`;
            const existsPrivate = (await userPuter.kv.get(privateKey)) || (await userPuter.kv.get(privateKeyOld));
            if (existsPrivate) {
                console.log(`Unsharing project ${projectId}: already private`);
                return jsonResponse(200, {
                    ok: true,
                    action: "unshare",
                    projectId,
                    visibility: "private",
                    message: "Project is already private"
                });
            }
            return jsonError(404, 'Project not found');
        }

        const project = publicRecord.value;
        const metadata = publicRecord.metadata;

        // Verify the authenticated user is the owner
        const ownerId = metadata?.userId || project?.ownerId || project?.metadata?.userId;
        if (ownerId && ownerId !== userId) {
            return jsonError(403, 'Unauthorized: You do not own this project');
        }

        // Prepare private project data
        const privateProject = {
            ...project,
            isPublic: false
        };
        delete privateProject.sharedBy;
        delete privateProject.sharedAt;
        if (privateProject.metadata) {
            delete privateProject.metadata;
        }

        console.log(`Unsharing project ${projectId}: copying to private KV...`);
        await userPuter.kv.set(privateKey, privateProject);
        console.log("Unsharing project: copy to private KV successful");

        console.log(`Unsharing project ${projectId}: deleting public copy...`);
        const delOk = await kvDelete(me.puter.kv, publicKey);
        if (!delOk) {
            throw new Error("Failed to delete from public KV");
        }
        console.log("Unsharing project: deleted public copy");

        return jsonResponse(200, {
            ok: true,
            action: "unshare",
            projectId,
            visibility: "private",
            project: privateProject
        });

    } catch (e) {
        console.error(`Error unsharing project: ${e.message}`, e);
        return jsonError(500, 'Failed to unshare project', { message: e.message || 'Unknown error' });
    }
};

router.post('/api/projects/:projectId/share', handleShare);
router.post('/api/projects/share', handleShare);

router.post('/api/projects/:projectId/unshare', handleUnshare);
router.post('/api/projects/unshare', handleUnshare);

router.get('/api/projects/public', async () => {
    try {
        const projects = [];
        if (me.puter.kv && typeof me.puter.kv.list === 'function') {
            const publicList = await me.puter.kv.list('project:*', true);
            if (publicList) {
                for (const item of publicList) {
                    if (item.value) {
                        const val = typeof item.value === 'string' ? JSON.parse(item.value) : item.value;
                        projects.push({
                            ...val,
                            isPublic: true,
                            sharedBy: item.metadata?.username || val.sharedBy,
                            sharedAt: item.metadata?.sharedAt || val.sharedAt,
                            ownerId: item.metadata?.userId || val.ownerId
                        });
                    }
                }
            }
        }
        return { projects };
    } catch (e) {
        return jsonError(500, 'Failed to list public projects', { message: e.message || 'Unknown error' });
    }
});