"use client";

type ShopCardProps = {
    id: string;
    name: string;
    type: "karakter" | "skin";
    owned?: boolean;
};

export function ShopCard({ name, type, owned }: ShopCardProps) {
    return (
        <div className="w-56 rounded-lg border bg-white p-4 shadow-sm">
            <div className="mb-3 flex h-28 w-full items-center justify-center rounded-md bg-gray-100 text-gray-400">
                gambar
            </div>
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-sm font-semibold">{name}</div>
                    <div className="text-xs text-gray-500">{type}</div>
                </div>
                <div className="text-xs font-medium text-gray-700">
                    {owned ? "Owned" : "Buy"}
                </div>
            </div>
        </div>
    );
}

export default ShopCard;
