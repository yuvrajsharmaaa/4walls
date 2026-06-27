import { useEffect, useRef, useState } from "react";
import {
    useLocation,
    useNavigate,
    useOutletContext,
    useParams,
} from "react-router";
import { Box, Download, RefreshCcw, X } from "lucide-react";
import Button from "../../componets/ui/button";
import { generate3DView } from "../../lib/ai.action";
import { createProject, getProjectById } from "../../lib/puter.action";
import { getFeaturedProjectById } from "../../lib/featured-projects";

const VisualizerIdRoute = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { userId } = useOutletContext<AuthContext>();

    const routeState = location.state as VisualizerLocationState | null;

    const hasInitialGenerated = useRef(false);

    const [project, setProject] = useState<DesignItem | null>(null);
    const [isProjectLoading, setIsProjectLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentImage, setCurrentImage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
            setErrorMessage(null);

            const result = await generate3DView({ sourceImage: item.sourceImage });

            if (!result.renderedImage) {
                setErrorMessage("AI render did not return an image. Please try again.");
                return;
            }

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
        } catch (error) {
            console.error("Generation failed:", error);
            setErrorMessage("Failed to generate the 3D visualization.");
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
            setErrorMessage(null);

            const fetchedProject = await getProjectById({ id });
            const featuredProject = getFeaturedProjectById(id);

            const resolvedProject: DesignItem | null =
                fetchedProject ??
                featuredProject ??
                (routeState?.initialImage
                    ? {
                          id,
                          name: routeState.name ?? `Residence ${id}`,
                          sourceImage: routeState.initialImage,
                          renderedImage: routeState.initialRender ?? undefined,
                          timestamp: Date.now(),
                      }
                    : null);

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

        if (project.isFeatured) {
            setCurrentImage(project.sourceImage);
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
                    <X className="icon" />
                    Exit Editor
                </Button>
            </nav>

            <div className="content">
                <div className="panel">
                    <div className="panel-header">
                        <div className="panel-meta">
                            <p>Project</p>
                            <h2>{projectName}</h2>
                            <p className="note">
                                {project?.isFeatured
                                    ? "Featured gallery render"
                                    : "Created by you"}
                            </p>
                        </div>

                        <div className="panel-actions">
                            <Button
                                variant="outline"
                                size="sm"
                                className="export"
                                onClick={handleExport}
                                disabled={!currentImage}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export
                            </Button>

                            {!project?.isFeatured && project?.sourceImage && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                        hasInitialGenerated.current = false;
                                        void runGeneration(project);
                                    }}
                                    disabled={isProcessing}
                                >
                                    <RefreshCcw className="w-4 h-4 mr-2" />
                                    Regenerate
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className={`render-area ${isProcessing ? "is-processing" : ""}`}>
                        {isProjectLoading ? (
                            <div className="render-placeholder min-h-105 flex items-center justify-center text-sm text-zinc-500">
                                Loading project...
                            </div>
                        ) : currentImage ? (
                            <img
                                src={currentImage}
                                alt={projectName}
                                className="render-img min-h-105"
                            />
                        ) : project?.sourceImage ? (
                            <img
                                src={project.sourceImage}
                                alt={projectName}
                                className="render-fallback min-h-105"
                            />
                        ) : (
                            <div className="render-placeholder min-h-105 flex items-center justify-center text-sm text-zinc-500">
                                Project not found.
                            </div>
                        )}

                        {isProcessing && (
                            <div className="render-overlay">
                                <div className="rendering-card">
                                    <RefreshCcw className="spinner" />
                                    <p className="title">Rendering...</p>
                                    <p className="subtitle">
                                        Generating your 3D visualization
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {errorMessage && (
                        <div className="px-5 py-4 border-t border-zinc-100 text-sm text-red-600">
                            {errorMessage}
                        </div>
                    )}
                </div>

                {project?.sourceImage && currentImage && project.sourceImage !== currentImage && (
                    <div className="panel compare">
                        <div className="panel-header">
                            <div className="panel-meta">
                                <h3>Comparison</h3>
                                <p className="hint">Before and after</p>
                            </div>
                        </div>

                        <div className="compare-stage grid grid-cols-1 md:grid-cols-2 gap-0 min-h-80">
                            <img
                                src={project.sourceImage}
                                alt="Source floor plan"
                                className="compare-img border-r border-zinc-200"
                            />
                            <img
                                src={currentImage}
                                alt="Rendered visualization"
                                className="compare-img"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VisualizerIdRoute;
