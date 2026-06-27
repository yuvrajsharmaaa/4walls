import { useState } from "react";
import {
    Upload as UploadIcon,
    CheckCircle2,
    Image as ImageIcon,
} from "lucide-react";
import { useOutletContext } from "react-router";

const Upload = ({ onComplete, className = "" }: UploadProps) => {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [progress, setProgress] = useState(0);

    const { isSignedIn } = useOutletContext<AuthContext>();

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (!isSignedIn) return;

        if (e.dataTransfer.files?.[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!isSignedIn) {
            e.currentTarget.value = "";
            return;
        }

        if (e.target.files?.[0]) {
            processFile(e.target.files[0]);
        }
    };

    const processFile = (selectedFile: File) => {
        setFile(selectedFile);
        setProgress(0);

        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            let completed = false;

            const interval = setInterval(() => {
                setProgress((prev) => {
                    const next = Math.min(prev + 15, 100);

                    if (next === 100 && !completed) {
                        completed = true;
                        clearInterval(interval);
                        setTimeout(() => {
                            void (async () => {
                                try {
                                    const outcome = await onComplete(result);
                                    if (outcome === false) {
                                        setFile(null);
                                        setProgress(0);
                                    }
                                } catch (error) {
                                    console.error("Upload failed:", error);
                                    setFile(null);
                                    setProgress(0);
                                }
                            })();
                        }, 600);
                    }

                    return next;
                });
            }, 100);
        };

        reader.readAsDataURL(selectedFile);
    };

    return (
        <div className={`upload ${className}`}>
            {!file ? (
                <div
                    className={`dropzone ${isDragging ? "is-dragging" : ""}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="drop-input"
                        onChange={handleFileSelect}
                        disabled={!isSignedIn}
                    />
                    <div className="drop-content">
                        <div className="drop-icon">
                            <UploadIcon className="h-5 w-5" />
                        </div>
                        <p>
                            {isSignedIn
                                ? "Click to upload or drag and drop"
                                : "Sign in to upload your floor plan"}
                        </p>
                        <p className="help">JPG, PNG up to 10MB</p>
                    </div>
                </div>
            ) : (
                <div className="upload-status">
                    <div className="status-content">
                        <div className="status-icon">
                            {progress === 100 ? (
                                <CheckCircle2 className="check h-5 w-5" />
                            ) : (
                                <ImageIcon className="h-5 w-5" />
                            )}
                        </div>
                        <h3>{file.name}</h3>
                        <div className="progress">
                            <div className="bar" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="status-text">
                            {progress < 100 ? "Analyzing floor plan..." : "Redirecting..."}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Upload;
