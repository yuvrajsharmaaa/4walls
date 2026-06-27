import type { Route } from "./+types/visualizer.$id";
import { ArrowLeft, Box } from "lucide-react";
import { Link, useLocation, useParams } from "react-router";
import { useEffect, useState } from "react";
import { getProjectById } from "../../lib/puter.action";

export function meta({ params }: Route.MetaArgs) {
    return [{ title: `4Wall — Project ${params.id}` }];
}

export default function VisualizerRoute() {
    const { id } = useParams();
    const location = useLocation();
    const state = location.state as {
        initialImage?: string;
        initialRendered?: string | null;
        name?: string;
    } | null;

    const [image, setImage] = useState<string | null>(state?.initialImage ?? null);
    const [name, setName] = useState(state?.name ?? "Untitled project");

    useEffect(() => {
        if (image || !id) return;

        void (async () => {
            const project = await getProjectById({ id });
            if (!project) return;

            setImage(project.renderedImage || project.sourceImage);
            setName(project.name);
        })();
    }, [id, image]);

    return (
        <div className="visualizer">
            <div className="topbar">
                <Link to="/" className="brand">
                    <Box className="logo" />
                    <span className="name">4Wall</span>
                </Link>

                <Link to="/" className="btn btn--ghost btn--sm exit">
                    <ArrowLeft className="icon" />
                    Back home
                </Link>
            </div>

            <div className="content">
                <div className="panel">
                    <div className="panel-header">
                        <div className="panel-meta">
                            <p>Visualizer</p>
                            <h2>{name}</h2>
                            <p className="note">Full AI rendering is coming soon.</p>
                        </div>
                    </div>

                    <div className="render-area">
                        {image ? (
                            <img src={image} alt={name} className="render-img" />
                        ) : (
                            <div className="compare-fallback min-h-105 flex items-center justify-center text-sm text-zinc-500">
                                Project not found.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
