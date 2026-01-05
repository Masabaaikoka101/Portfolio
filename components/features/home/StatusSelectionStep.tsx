"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { STATUS_OPTIONS } from "@/lib/constants";

interface StatusSelectionStepProps {
    originalImage: string;
    status: string;
    setStatus: (status: string) => void;
    onStartAnalysis: () => void;
    onReset: () => void;
}

export function StatusSelectionStep({
    originalImage,
    status,
    setStatus,
    onStartAnalysis,
    onReset,
}: StatusSelectionStepProps) {
    return (
        <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in duration-300">
            <div className="space-y-4">
                <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 mb-6">
                    <img
                        src={originalImage}
                        alt="Selected"
                        className="w-full h-full object-contain"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="status">商品の状態</Label>
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger id="status" className="w-full">
                            <SelectValue placeholder="状態を選択" />
                        </SelectTrigger>
                        <SelectContent>
                            {STATUS_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                    {option}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button
                    onClick={onStartAnalysis}
                    disabled={!status}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg rounded-full disabled:opacity-50"
                >
                    AIで分析を開始
                </Button>
                <button
                    onClick={onReset}
                    className="w-full text-sm text-gray-500 hover:text-red-500 underline mt-2"
                >
                    画像を変更する
                </button>
            </div>
        </div>
    );
}
