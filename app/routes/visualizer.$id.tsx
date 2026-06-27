import { useNavigate, useLocation, useOutletContext, useParams } from "react-router";
import { useEffect, useRef, useState } from "react";
import { generate3DView } from "../../lib/ai.action";
import { Box, Download, RefreshCcw, Share2, X } from "lucide-react";
import Button from "../../componets/ui/button";
import { createProject, getProjectById, shareProject, unshareProject } from "../../lib/puter.action";
import { ReactCompareSlider, ReactCompareSliderImage } from "react-compare-slider";

const buildProjectFromState = (
    id: string,
    state: VisualizerLocationState | null,
): DesignItem | null => {
    if (!state?.initialImage) return null;

    return {
        id,
        name: state.name ?? `Residence ${id}`,
        sourceImage: state.initialImage,
        renderedImage: state.initialRender ?? undefined,
        timestamp: Date.now(),
    };
};

const VisualizerId = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const routeState = location.state as VisualizerLocationState | null;
    const authContext = useOutletContext<AuthContext>();
    const userId = authContext.userId;

    const hasInitialGenerated = useRef(false);

    const [project, setProject] = useState<DesignItem | null>(null);
    const [isProjectLoading, setIsProjectLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentImage, setCurrentImage] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [isSharing, setIsSharing] = useState(false);

    const handleShareToggle = async () => {
        if (!project || !id) return;

        if (!authContext.isSignedIn) {
            const signedIn = await authContext.signIn();
            if (!signedIn) {
                console.warn("User canceled sign in or authentication failed.");
                return;
            }
            const updatedAuth = await authContext.refreshAuth();
            if (!updatedAuth) return;
        }

        setIsSharing(true);
        try {
            if (project.isPublic) {
                const res = await unshareProject(project.id);
                if (res && res.ok) {
                    setProject(prev => prev ? { ...prev, isPublic: false } : null);
                } else {
                    console.error("Failed to unshare project");
                }
            } else {
                const res = await shareProject(project.id);
                if (res && res.ok) {
                    setProject(prev => prev ? { ...prev, isPublic: true } : null);
                } else {
                    console.error("Failed to share project");
                }
            }
        } catch (error) {
            console.error("Failed to share/unshare project:", error);
        } finally {
            setIsSharing(false);
        }
    };

    useEffect(() => {
        setIsClient(true);
    }, []);

    const handleBack = () => navigate("/");

    const handleExport = () => {
        if (!currentImage) return;

        const link = document.createElement("a");
        link.href = currentImage;
        link.download = `4wall-${id || "design"}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const runGeneration = async (item: DesignItem) => {
        if (!id || !item.sourceImage) return;

        try {
            setIsProcessing(true);
            const result = await generate3DView({ sourceImage: item.sourceImage });

            if (result.renderedImage) {
                setCurrentImage(result.renderedImage);

                const updatedItem: DesignItem = {
                    ...item,
                    renderedImage: result.renderedImage,
                    renderedPath: result.renderedPath,
                    timestamp: Date.now(),
                    ownerId: item.ownerId ?? userId ?? null,
                    isPublic: item.isPublic ?? false,
                };

                const saved = await createProject({
                    item: updatedItem,
                    visibility: "private",
                });

                if (saved) {
                    setProject(saved);
                    setCurrentImage(saved.renderedImage || result.renderedImage);
                }
            }
        } catch (error) {
            console.error("Generation failed:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    useEffect(() => {
        let isMounted = true;

        const loadProject = async () => {
            if (!id) {
                setIsProjectLoading(false);
                return;
            }

            setIsProjectLoading(true);

            const fetchedProject = await getProjectById({ id });
            const resolvedProject =
                fetchedProject ?? buildProjectFromState(id, routeState);

            if (!isMounted) return;

            setProject(resolvedProject);
            setCurrentImage(
                resolvedProject?.renderedImage ??
                    routeState?.initialRender ??
                    null,
            );
            setIsProjectLoading(false);
            hasInitialGenerated.current = false;
        };

        void loadProject();

        return () => {
            isMounted = false;
        };
    }, [id, routeState?.initialImage, routeState?.initialRender, routeState?.name]);

    useEffect(() => {
        if (isProjectLoading || hasInitialGenerated.current || !project?.sourceImage) {
            return;
        }

        if (project.renderedImage) {
            setCurrentImage(project.renderedImage);
            hasInitialGenerated.current = true;
            return;
        }

        hasInitialGenerated.current = true;
        void runGeneration(project);
    }, [project, isProjectLoading]);

    const projectName = project?.name || routeState?.name || `Residence ${id}`;

    return (
        <div className="visualizer">
            <nav className="topbar">
                <div className="brand">
                    <Box className="logo" />
                    <span className="name">4Wall</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleBack} className="exit">
                    <X className="icon" /> Exit Editor
                </Button>
            </nav>

            <section className="content">
                <div className="panel">
                    <div className="panel-header">
                        <div className="panel-meta">
                            <p>Project</p>
                            <h2>{projectName}</h2>
                            <p className="note">Created by you • {project?.isPublic ? "Shared (Public)" : "Private"}</p>
                        </div>

                        <div className="panel-actions">
                            <Button
                                size="sm"
                                onClick={handleExport}
                                className="export"
                                disabled={!currentImage}
                            >
                                <Download className="w-4 h-4 mr-2" /> Export
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleShareToggle}
                                className={`share ${project?.isPublic ? "is-public bg-zinc-800 text-white" : ""}`}
                                disabled={isSharing}
                            >
                                <Share2 className="w-4 h-4 mr-2" />
                                {isSharing ? "Processing..." : project?.isPublic ? "Unshare" : "Share"}
                            </Button>
                        </div>
                    </div>

                    <div className={`render-area ${isProcessing ? "is-processing" : ""}`}>
                        {isProjectLoading ? (
                            <div className="render-placeholder min-h-105 flex items-center justify-center text-sm text-zinc-500">
                                Loading project...
                            </div>
                        ) : currentImage ? (
                            <img src={currentImage} alt="AI Render" className="render-img" />
                        ) : (
                            <div className="render-placeholder">
                                {project?.sourceImage && (
                                    <img
                                        src={project.sourceImage}
                                        alt="Original"
                                        className="render-fallback"
                                    />
                                )}
                            </div>
                        )}

                        {isProcessing && (
                            <div className="render-overlay">
                                <div className="rendering-card">
                                    <RefreshCcw className="spinner" />
                                    <span className="title">Rendering...</span>
                                    <span className="subtitle">
                                        Generating your 3D visualization
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="panel compare">
                    <div className="panel-header">
                        <div className="panel-meta">
                            <p>Comparison</p>
                            <h3>Before and After</h3>
                        </div>
                        <div className="hint">Drag to compare</div>
                    </div>

                    <div className="compare-stage">
                        {isClient && project?.sourceImage && currentImage ? (
                            <ReactCompareSlider
                                defaultValue={50}
                                style={{ width: "100%", height: "auto" }}
                                itemOne={
                                    <ReactCompareSliderImage
                                        src={project.sourceImage}
                                        alt="before"
                                        className="compare-img"
                                    />
                                }
                                itemTwo={
                                    <ReactCompareSliderImage
                                        src={currentImage ?? project.renderedImage ?? undefined}
                                        alt="after"
                                        className="compare-img"
                                    />
                                }
                            />
                        ) : (
                            <div className="compare-fallback">
                                {project?.sourceImage && (
                                    <img
                                        src={project.sourceImage}
                                        alt="Before"
                                        className="compare-img"
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default VisualizerId;
