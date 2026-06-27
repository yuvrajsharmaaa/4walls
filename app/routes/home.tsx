import type { Route } from "./+types/home";
import { ArrowRight, ArrowUpRight, Clock, Layers } from "lucide-react";
import Button from "../../componets/ui/button";
import Upload from "../../componets/Upload";
import { useLocation, useNavigate } from "react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { createProject, getProjects } from "../../lib/puter.action";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "4Wall — AI Architectural Visualization" },
        {
            name: "description",
            content:
                "Transform floor plans into photorealistic spaces with AI-powered design intelligence.",
        },
    ];
}

export default function Home() {
    const navigate = useNavigate();
    const location = useLocation();
    const [projects, setProjects] = useState<DesignItem[]>([]);
    const [isLoadingProjects, setIsLoadingProjects] = useState(true);
    const isCreatingProjectRef = useRef(false);

    const loadProjects = useCallback(async () => {
        setIsLoadingProjects(true);
        const items = await getProjects();
        const sorted = [...items].sort((a, b) => b.timestamp - a.timestamp);
        setProjects(sorted);
        setIsLoadingProjects(false);
    }, []);

    const handleUploadComplete = async (base64Image: string) => {
        try {
            if (isCreatingProjectRef.current) return false;
            isCreatingProjectRef.current = true;

            const newId = Date.now().toString();
            const name = `Residence ${newId}`;

            const newItem: DesignItem = {
                id: newId,
                name,
                sourceImage: base64Image,
                timestamp: Date.now(),
            };

            const saved = await createProject({ item: newItem, visibility: "private" });

            if (!saved) {
                console.error("Failed to create project");
                return false;
            }

            navigate(`/visualizer/${saved.id}`, {
                state: {
                    initialImage: saved.sourceImage,
                    initialRendered: saved.renderedImage || null,
                    name: saved.name,
                },
            });

            return true;
        } finally {
            isCreatingProjectRef.current = false;
        }
    };

    useEffect(() => {
        void loadProjects();
    }, [loadProjects, location.key]);

    return (
        <div className="home">
            <section className="hero">
                <div className="announce"></div>

                <h1>FourWalls Where Great Spaces Begin with a Thought!</h1>

                <p className="subtitle">
                    From the first sketch to the final render, 4Walls brings together AI,
                    design intelligence, and photorealistic visualization in one seamless
                    creative workspace.
                </p>

                <div className="actions">
                    <a href="#upload" className="cta">
                        Start Designing <ArrowRight className="icon" />
                    </a>

                    <Button variant="outline" size="lg" className="demo">
                        Try a Demo
                    </Button>
                </div>

                <div id="upload" className="upload-shell">
                    <div className="grid-overlay" />

                    <div className="upload-card">
                        <div className="upload-head">
                            <div className="upload-icon">
                                <Layers className="icon" />
                            </div>

                            <h3>Upload your floor plan</h3>
                            <p>Supports JPG and PNG formats up to 10MB</p>
                        </div>

                        <Upload onComplete={handleUploadComplete} />
                    </div>
                </div>
            </section>

            <section className="projects">
                <div className="section-inner">
                    <div className="section-head">
                        <div className="copy">
                            <h2>Recent Projects</h2>
                            <p>Your latest rendered designs, saved automatically after each visualization.</p>
                        </div>
                    </div>

                    {isLoadingProjects ? (
                        <div className="loading">Loading projects...</div>
                    ) : projects.length === 0 ? (
                        <div className="empty">
                            No projects yet. Upload a floor plan above to create your first render.
                        </div>
                    ) : (
                        <div className="projects-grid">
                            {projects.map(({ id, name, renderedImage, sourceImage, timestamp }) => (
                                <article
                                    key={id}
                                    className="project-card group"
                                    onClick={() =>
                                        navigate(`/visualizer/${id}`, {
                                            state: {
                                                initialImage: sourceImage,
                                                initialRendered: renderedImage || null,
                                                name,
                                            },
                                        })
                                    }
                                >
                                    <div className="preview">
                                        <img
                                            src={renderedImage || sourceImage}
                                            alt={name ?? "Project"}
                                            loading="lazy"
                                        />

                                        <div className="badge">
                                            <span>{renderedImage ? "Rendered" : "Processing"}</span>
                                        </div>
                                    </div>

                                    <div className="card-body">
                                        <div>
                                            <h3>{name}</h3>

                                            <div className="meta">
                                                <Clock size={12} />
                                                <span>
                                                    {new Date(timestamp).toLocaleDateString()}
                                                </span>
                                                <span>Saved</span>
                                            </div>
                                        </div>

                                        <div className="arrow">
                                            <ArrowUpRight size={18} />
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
