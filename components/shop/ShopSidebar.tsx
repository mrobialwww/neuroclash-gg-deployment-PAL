import Image from "next/image";

type SidebarProps = {
    active?: "karakter" | "skin" | "dimiliki" | "room";
    onChange?: (filter: "karakter" | "skin" | "dimiliki" | "room") => void;
};

const navItems: Array<{
    name: string;
    key: "karakter" | "skin" | "dimiliki" | "room";
    icon: string;
}> = [
    { name: "Karakter", key: "karakter", icon: "/icons/character.svg" },
    { name: "Skin", key: "skin", icon: "/icons/skin.svg" },
    { name: "Dimiliki", key: "dimiliki", icon: "/icons/owned.svg" },
    { name: "Ruang Ganti", key: "room", icon: "/icons/room.svg" },
];

export function Sidebar({ active = "karakter", onChange }: SidebarProps) {
    const activeStyle = {
        background:
            "linear-gradient(to right, rgba(101,139,255,1) 0%, rgba(101,139,255,1) 20%, transparent 100%)",
    };

    const activeStyleMobile = {
        background:
            "linear-gradient(to bottom, rgba(101,139,255,1) 0%, rgba(101,139,255,1) 20%, transparent 100%)",
    };

    return (
        <>
            {/* Sidebar — tampil di md ke atas */}
            <aside className="w-68 fixed z-20 hidden h-screen flex-col bg-[#172844] p-4 text-white md:flex">
                <nav className="mt-4 flex flex-col gap-2">
                    {navItems.map((item) => {
                        const isActive = active === item.key;
                        return (
                            <button
                                key={item.key}
                                onClick={() => onChange?.(item.key)}
                                className="group flex w-full items-center gap-3 overflow-hidden rounded-md px-3 py-3 text-left transition"
                                style={isActive ? activeStyle : undefined}
                            >
                                <div className="shrink-0">
                                    <Image
                                        src={item.icon}
                                        alt={item.name}
                                        width={24}
                                        height={24}
                                        className={
                                            isActive
                                                ? "opacity-100"
                                                : "opacity-60"
                                        }
                                    />
                                </div>
                                <span
                                    className={`font-medium ${
                                        isActive
                                            ? "text-white"
                                            : "text-white/60"
                                    }`}
                                >
                                    {item.name}
                                </span>
                            </button>
                        );
                    })}
                </nav>
            </aside>

            <nav className="fixed bottom-0 left-0 right-0 z-50 flex bg-[#172844] pb-[env(safe-area-inset-bottom)] text-white md:hidden">
                {navItems.map((item) => {
                    const isActive = active === item.key;
                    return (
                        <button
                            key={item.key}
                            onClick={() => onChange?.(item.key)}
                            className="relative flex flex-1 flex-col items-center justify-center gap-1 overflow-hidden py-2 transition"
                            style={isActive ? activeStyleMobile : undefined}
                        >
                            <Image
                                src={item.icon}
                                alt={item.name}
                                width={20}
                                height={20}
                                className={
                                    isActive ? "opacity-100" : "opacity-60"
                                }
                            />
                            <span
                                className={`text-[10px] font-medium leading-none ${
                                    isActive ? "text-white" : "text-white/60"
                                }`}
                            >
                                {item.name}
                            </span>
                        </button>
                    );
                })}
            </nav>
        </>
    );
}

export default Sidebar;
