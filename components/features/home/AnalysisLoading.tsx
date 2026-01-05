"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function AnalysisLoading() {
    const [mounted, setMounted] = useState(false);
    const [dots, setDots] = useState("");

    useEffect(() => {
        setMounted(true);
        const interval = setInterval(() => {
            setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
        }, 500);
        return () => clearInterval(interval);
    }, []);

    return (
        <main className="min-h-screen bg-white flex items-center justify-center">
            <div
                className={cn(
                    "flex flex-col items-center transition-all duration-1000 ease-out",
                    mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                )}
            >
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-100 rounded-full blur-xl opacity-50 animate-pulse" />
                    <h2 className="relative text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-6">
                        生成中
                        <span className="inline-block w-8 text-blue-600">{dots}</span>
                    </h2>
                </div>

                <p className="text-gray-400 text-sm font-medium tracking-wide uppercase">
                    AI IS ANALYZING YOUR ITEM
                </p>

                {/* Minimal Progress Line */}
                <div className="mt-12 w-48 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 animate-[loading_1.5s_ease-in-out_infinite]" />
                </div>

                <style jsx global>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(0%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
            </div>
        </main>
    );
}
