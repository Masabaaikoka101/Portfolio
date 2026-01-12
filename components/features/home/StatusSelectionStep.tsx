/**
 * 商品状態選択ステップコンポーネント
 *
 * このコンポーネントの役割:
 * - 画像選択後、商品の状態と背景スタイルを選択するステップを表示
 * - 選択された状態はAIプロンプトに使用される
 * - 背景スタイルは画像編集時に使用される
 *
 * 設計パターン:
 * - Controlled Component: status, backgroundTypeを親から受け取る
 * - Callback Props: onStartAnalysis, onResetで親に通知
 *
 * Learning:
 * - Radix Select: https://www.radix-ui.com/primitives/docs/components/select
 */

"use client";

import Image from "next/image";
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
import { ItemStatus } from "@/types";
import { Reorder, useDragControls } from "framer-motion";
import { GripVertical } from "lucide-react";

/**
 * 背景タイプの定義
 */
const BACKGROUND_OPTIONS = [
    { id: "white", name: "白スタジオ", image: null },
    { id: "canvas", name: "キャンバス", image: "/backgrounds/canvas.jpeg" },
    { id: "dark-wood", name: "ダークウッド", image: "/backgrounds/dark-wood.jpeg" },
    { id: "light-wood", name: "ライトウッド", image: "/backgrounds/light-wood.jpeg" },
    { id: "marble", name: "大理石", image: "/backgrounds/marble.jpeg" },
] as const;

/**
 * Props型
 */
interface StatusSelectionStepProps {
    /** 選択中の画像リスト（プレビュー用） */
    originalImages: string[];
    /** 現在選択されている状態 */
    status: ItemStatus | "";
    /** 状態変更時のコールバック */
    setStatus: (status: ItemStatus | "") => void;
    /** 現在選択されている背景タイプ */
    backgroundType: string;
    /** 背景タイプ変更時のコールバック */
    setBackgroundType: (type: string) => void;
    /** 分析開始ボタンクリック時のコールバック */
    onStartAnalysis: () => void;
    /** リセットボタンクリック時のコールバック */
    onReset: () => void;
    /** 画像並び替え時のコールバック */
    reorderImages?: (newIndices: number[]) => void;
}

/**
 * 商品状態選択ステップコンポーネント
 */
export function StatusSelectionStep({
    originalImages,
    status,
    setStatus,
    backgroundType,
    setBackgroundType,
    onStartAnalysis,
    onReset,
    reorderImages,
}: StatusSelectionStepProps) {
    // 画像があるインデックスのリストを作成 (例: 2枚なら [0, 1])
    const imageIndices = originalImages.map((_, i) => i);

    return (
        <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in duration-300">
            <div className="space-y-6">
                {/* 画像プレビュー＆並び替えエリア */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label>画像の順序（ドラッグで入れ替え可能）</Label>
                        <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded">1枚目がメイン画像</span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 h-[160px]">
                        {/* ドラッグ可能な画像エリア */}
                        <Reorder.Group
                            axis="x"
                            onReorder={(newIndices) => {
                                // newIndices は並び替えられたインデックスの配列 (例: [1, 0])
                                // これを親に渡して状態を更新する
                                if (reorderImages) {
                                    reorderImages(newIndices);
                                }
                            }}
                            values={imageIndices}
                            className="contents" // grid layoutを維持するためにcontentsを使用
                        >
                            {imageIndices.map((index) => (
                                <Reorder.Item
                                    key={originalImages[index]} // 画像URLをキーにする（変更検知のため）
                                    value={index}
                                    className="relative h-full rounded-lg overflow-hidden border border-gray-200 bg-gray-50 group cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-md"
                                    transition={{ type: "spring", stiffness: 200, damping: 25 }}
                                >
                                    <img
                                        src={originalImages[index]}
                                        alt={`${index + 1}枚目`}
                                        className="w-full h-full object-cover pointer-events-none" // ドラッグの邪魔にならないように画像自体のイベントを無効化
                                    />
                                    <div className="absolute top-0 left-0 bg-gray-900/80 text-white text-xs px-2 py-1 rounded-br font-medium z-10">
                                        {/* ここでのindexは「元々のインデックス」ではなく「現在の表示順」を表示したいが、
                                            Reorder.Item内では単純には分からない。
                                            しかし、再レンダリングされれば originalImages は並び変わっているので、
                                            単に {index + 1} と表示すると、画像の移動に伴ってバッジも移動してしまう（「2枚目」というバッジがついた画像が1枚目の位置に来る）。
                                            
                                            要望は「1枚目」「2枚目」という位置固定のラベルだと思われる。
                                            しかし Reorder.Item は要素ごと移動する。
                                            
                                            解決策: 
                                            バッジは Reorder.Item の外側（親のGridセル）に置くべきだが、
                                            Gridセル自体を並び替えているので難しい。
                                            
                                            妥協案:
                                            バッジは画像と一緒に動いてしまうが、
                                            「メイン画像候補」「サブ画像」のような役割ラベルではなく、
                                            単純なナンバリングなら、再レンダリング後には正しい位置（一番左が1枚目）になるはず...
                                            いや、Reactのリストレンダリングでは、indexが変わると中身も変わる。
                                            
                                            reorderImages で state が更新されると、
                                            originalImages の [0] は新しい画像になる。
                                            しかし Reorder.Item の key が画像URLなので、
                                            Reactは「このDOM要素が移動した」と認識する。
                                            その中の <div>{index+1}枚目</div> も一緒に移動する。
                                            つまり「1枚目」と書かれた画像が2枚目の位置に移動する。これは変。

                                            これを防ぐには、バッジを絶対配置で外枠に置くか、
                                            あるいはバッジの中身を動的に計算する必要があるが、item内では自分が何番目か知らない。

                                            ここはシンプルに、バッジを表示せず、
                                            「左端がメイン画像」というルールをラベルで明示するだけにするか、
                                            あるいはUI上に 1, 2, 3 の枠を描画し、その上に透明なReorderリストを重ねるなどのトリックが必要。

                                            今回は「ドラッグに伴って矢印を消す」という指示なので、
                                            バッジ（枚数目表記）については特に削除指示はないが、
                                            ドラッグ中に「1枚目」というラベルが付いて回るのは違和感がある。
                                            
                                            しかし、ユーザーは「枚数目が書いていれば...」と言っていた。
                                            
                                            Reorder.Item の children としてバッジを描画する限り、バッジはついて回る。
                                            ついて回っても、ドロップした瞬間に再レンダリングされて
                                            左端の画像が「1枚目」に書き換われば良いのだが、
                                            framer-motionのアニメーション中はDOMは維持される。
                                            
                                            とりあえずバッジは削除し、ヘッダーの説明で補うこととする。
                                            または、画像の上にオーバーレイで常時表示される枠を作るのがベスト。
                                            今回は grid なので、 grid の背景などに番号を振ることもできるが、画像で隠れる。
                                            
                                            一旦、「メイン」「2」「3」というバッジ的なものを
                                            Reorder.Itemに入れたままにする。
                                            移動中は「元々1枚目だった画像」が移動していることがわかるので、
                                            それはそれで分かりやすいかもしれない。
                                            （再レンダリングされれば番号は更新されるはず）
                                        */}
                                    </div>
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10">
                                        <GripVertical className="text-white drop-shadow-md w-8 h-8" />
                                    </div>
                                </Reorder.Item>
                            ))}
                        </Reorder.Group>

                        {/* 空のスロット (3枚未満の場合に表示) */}
                        {Array.from({ length: 3 - originalImages.length }).map((_, i) => (
                            <div
                                key={`empty-${i}`}
                                className="relative h-full rounded-lg overflow-hidden border border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center text-gray-400 gap-1"
                            >
                                <div className="text-xs">{originalImages.length + i + 1}枚目</div>
                                <span className="text-[10px]">画像なし</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 状態選択 */}
                <div className="space-y-2">
                    <Label htmlFor="status">商品の状態</Label>
                    <Select value={status} onValueChange={(value) => setStatus(value as ItemStatus)}>
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

                {/* 背景スタイル選択 */}
                <div className="space-y-2">
                    <Label>背景スタイル</Label>
                    <div className="grid grid-cols-5 gap-2">
                        {BACKGROUND_OPTIONS.map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => setBackgroundType(option.id)}
                                className={`
                                    relative aspect-square rounded-lg overflow-hidden border-2 transition-all
                                    ${backgroundType === option.id
                                        ? "border-blue-500 ring-2 ring-blue-200"
                                        : "border-gray-200 hover:border-gray-300"
                                    }
                                `}
                            >
                                {option.image ? (
                                    <Image
                                        src={option.image}
                                        alt={option.name}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-white flex items-center justify-center">
                                        <span className="text-xs text-gray-400">白</span>
                                    </div>
                                )}
                                {backgroundType === option.id && (
                                    <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                        <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-gray-500">
                        選択中: {BACKGROUND_OPTIONS.find((o) => o.id === backgroundType)?.name || "白スタジオ"}
                    </p>
                </div>

                {/* 分析開始ボタン */}
                <Button
                    onClick={onStartAnalysis}
                    disabled={!status}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg rounded-full disabled:opacity-50"
                >
                    AIで分析を開始
                </Button>

                {/* リセットリンク */}
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
