"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

type TutorialDialogProps = {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export function TutorialDialog({
    children,
    open,
    onOpenChange,
}: TutorialDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">
                        Pigroの使い方
                    </DialogTitle>
                </DialogHeader>

                {/* YouTube動画埋め込み */}
                {process.env.NEXT_PUBLIC_TUTORIAL_VIDEO_ID && (
                    <div
                        className="relative w-full rounded-lg overflow-hidden bg-gray-900"
                        style={{ paddingBottom: "56.25%" }}
                    >
                        <iframe
                            className="absolute top-0 left-0 w-full h-full border-0"
                            src={`https://www.youtube.com/embed/${process.env.NEXT_PUBLIC_TUTORIAL_VIDEO_ID}?rel=0`}
                            title="Pigroの使い方チュートリアル"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                )}

                {/* ステップ説明 */}
                <div className="space-y-4 py-4">
                    <div className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                            1
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">
                                ログイン・新規登録
                            </h3>
                            <p className="text-sm text-gray-600">
                                まずログインして、あなた専用のデータ管理しましょう
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                            2
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">
                                商品画像をアップロード
                            </h3>
                            <p className="text-sm text-gray-600">
                                売りたい商品の写真を選択してください
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                            3
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">
                                AIが自動生成
                            </h3>
                            <p className="text-sm text-gray-600">
                                商品画像・商品名・説明文・価格をAIが提案します
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                            4
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">
                                編集して更新
                            </h3>
                            <p className="text-sm text-gray-600">
                                内容を確認・編集してから更新できます
                            </p>
                        </div>
                    </div>
                </div>
                {/* バグ報告リンク */}
                <div className="text-center pt-2 border-t">
                    <a
                        href="https://forms.gle/gmjTgxPjNaCjmXJR7"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-500 hover:text-blue-600 underline"
                    >
                        バグ・ご意見を報告する
                    </a>
                </div>
                <Button
                    onClick={() => onOpenChange(false)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-full"
                >
                    閉じる
                </Button>
            </DialogContent>
        </Dialog>
    );
}
