import type { Route } from "./+types/home";
import { ArrowRight, ArrowUpRight, Clock, Layers } from "lucide-react";
import Button from "../../componets/ui/button";
import Upload from "../../componets/Upload";
import { useNavigate } from "react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { createProject, getProjects } from "../../lib/puter.action";

const FEATURED_PROJECTS: DesignItem[] = [
    {
        id: "featured-loft",
        name: "Warm Modern Loft",
        sourceImage:
            "https://i.pinimg.com/736x/6c/f5/23/6cf5235987dfa4c2239f0452078fb51c.jpg",
        renderedImage:
            "https://i.pinimg.com/736x/6c/f5/23/6cf5235987dfa4c2239f0452078fb51c.jpg",
        timestamp: Date.now() - 1000 * 60 * 60 * 24 * 5,
        isFeatured: true,
    },
    {
        id: "featured-lounge",
        name: "Sunlit Living Room",
        sourceImage:
            "https://i.pinimg.com/736x/f9/1a/62/f91a622df97023be4e7b200af7ffd6c3.jpg",
        renderedImage:
            "https://i.pinimg.com/736x/f9/1a/62/f91a622df97023be4e7b200af7ffd6c3.jpg",
        timestamp: Date.now() - 1000 * 60 * 60 * 24 * 12,
        isFeatured: true,
    },
];

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
    const [projects, setProjects] = useState<DesignItem[]>([]);
    const isCreatingProjectRef = useRef(false);

    const displayProjects = useMemo(() => {
        const userIds = new Set(projects.map((project) => project.id));
        const featured = FEATURED_PROJECTS.filter(
            (project) => !userIds.has(project.id),
        );
        return [...projects, ...featured];
    }, [projects]);

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

            setProjects((prev) => [saved, ...prev]);

            navigate(`/visualizer/${newId}`, {
                state: {
                    initialImage: saved.sourceImage,
                    initialRendered: saved.renderedImage || null,
                    name,
                },
            });

            return true;
        } finally {
            isCreatingProjectRef.current = false;
        }
    };

    useEffect(() => {
        const fetchProjects = async () => {
            const items = await getProjects();
            setProjects(items);
        };

        fetchProjects();
    }, []);

    return (
        <div className="home">
            <section className="hero">
                <div className="announce">
                    
                </div>

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
                            <h2>Projects</h2>
                              <p>Your latest work and shared community projects, all in one place.</p>
                        </div>
                    </div>

                    <div className="projects-grid">
                        {displayProjects.map(
                            ({ id, name, renderedImage, sourceImage, timestamp, isFeatured }) => (
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
                                            alt={name}
                                            loading="lazy"
                                        />

                                        <div className="badge">
                                            <span>{isFeatured ? "Featured" : "Your work"}</span>
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
                                                <span>{isFeatured ? "4Wall Gallery" : "Saved"}</span>
                                            </div>
                                        </div>

                                        <div className="arrow">
                                            <ArrowUpRight size={18} />
                                        </div>
                                    </div>
                                </article>
                            ),
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
