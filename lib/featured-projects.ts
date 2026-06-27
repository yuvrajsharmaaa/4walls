export const FEATURED_PROJECTS: DesignItem[] = [
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

export const getFeaturedProjectById = (id: string) =>
    FEATURED_PROJECTS.find((project) => project.id === id) ?? null;
