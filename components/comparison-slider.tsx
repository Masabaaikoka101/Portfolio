"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { ChevronsLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComparisonSliderProps {
    imageBefore: string;
    imageAfter: string;
    className?: string;
}

export function ComparisonSlider({
    imageBefore,
    imageAfter,
    className,
}: ComparisonSliderProps) {
    const [position, setPosition] = useState(50);
    const [isResizing, setIsResizing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMove = useCallback(
        (clientX: number) => {
            if (!containerRef.current) return;
            const { left, width } = containerRef.current.getBoundingClientRect();
            const x = clientX - left;
            const newPos = Math.min(Math.max((x / width) * 100, 0), 100);
            setPosition(newPos);
        },
        []
    );

    const onMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!isResizing) return;
            handleMove(e.clientX);
        },
        [isResizing, handleMove]
    );

    const onTouchMove = useCallback(
        (e: TouchEvent) => {
            if (!isResizing) return;
            handleMove(e.touches[0].clientX);
        },
        [isResizing, handleMove]
    );

    const onMouseUp = useCallback(() => {
        setIsResizing(false);
    }, []);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener("mousemove", onMouseMove);
            window.addEventListener("touchmove", onTouchMove);
            window.addEventListener("mouseup", onMouseUp);
            window.addEventListener("touchend", onMouseUp);
        }
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("touchmove", onTouchMove);
            window.removeEventListener("mouseup", onMouseUp);
            window.removeEventListener("touchend", onMouseUp);
        };
    }, [isResizing, onMouseMove, onTouchMove, onMouseUp]);

    return (
        <div
            ref={containerRef}
            className={cn(
                "relative w-full aspect-[4/3] select-none overflow-hidden rounded-xl border border-gray-200 shadow-sm",
                className
            )}
            onMouseDown={(e) => {
                setIsResizing(true);
                handleMove(e.clientX);
            }}
            onTouchStart={(e) => {
                setIsResizing(true);
                handleMove(e.touches[0].clientX);
            }}
        >
            {/* After Image (Background) */}
            <div className="absolute inset-0 h-full w-full">
                <Image
                    src={imageAfter}
                    alt="After"
                    fill
                    className="object-cover"
                    draggable={false}
                    style={{ filter: 'brightness(1.08) contrast(1.05) saturate(1.1)' }} // Simple "Pro" filter simulation
                />
                <div className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 text-xs rounded-md backdrop-blur-sm">
                    After (AI Processed)
                </div>
            </div>

            {/* Before Image (Foreground, clipped) */}
            <div
                className="absolute inset-0 h-full w-full overflow-hidden"
                style={{ width: `${position}%` }}
            >
                <div className="relative h-full w-full">
                    <div className="absolute inset-0 w-[100cqw] h-full">
                        <Image
                            src={imageBefore}
                            alt="Before"
                            fill
                            className="object-cover max-w-none w-full h-full"
                            style={{ width: containerRef.current?.offsetWidth || '100%' }}
                            draggable={false}
                        />
                    </div>
                </div>
                <div className="absolute top-4 left-4 bg-black/50 text-white px-2 py-1 text-xs rounded-md backdrop-blur-sm z-10">
                    Before
                </div>
            </div>

            {/* Slider Handle */}
            <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.3)] cursor-ew-resize z-20 flex items-center justify-center pointer-events-none"
                style={{ left: `${position}%` }}
            >
                <div className="h-8 w-8 bg-white rounded-full flex items-center justify-center shadow-lg transform -translate-x-1/2 text-gray-600">
                    <ChevronsLeftRight className="w-4 h-4" />
                </div>
            </div>
        </div>
    );
}
