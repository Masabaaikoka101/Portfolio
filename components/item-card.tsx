"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface ItemCardProps {
    imageUrl: string;
    title: string;
    price: number;
    status: string;
    createdAt: string;
    className?: string;
    isEditMode?: boolean;
    onClick?: (e: React.MouseEvent) => void;
}

export function ItemCard({
    imageUrl,
    title,
    price,
    status,
    createdAt,
    className,
    isEditMode = false,
    onClick,
}: ItemCardProps) {
    // Format date
    const formattedDate = new Date(createdAt).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });

    return (
        <div
            className={cn(
                "bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer",
                className
            )}
            onClick={onClick}
        >
            {/* Image with Price Overlay */}
            <div className="relative aspect-square bg-gray-100">
                <Image
                    src={imageUrl}
                    alt={title}
                    fill
                    className={`object-cover ${isEditMode ? "pointer-events-none select-none" : ""}`}
                    sizes="(max-width: 768px) 50vw, 25vw"
                    draggable={!isEditMode}
                />
                <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm font-bold">
                    ¥{price.toLocaleString()}
                </div>
            </div>

            {/* Content */}
            <div className="p-3">
                <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight mb-2">
                    {title}
                </h3>
                <div className="flex items-center justify-between gap-2">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full truncate">
                        {status}
                    </span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                        {formattedDate}
                    </span>
                </div>
            </div>
        </div>
    );
}
