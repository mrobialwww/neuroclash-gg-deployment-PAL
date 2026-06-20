"use client";

import Image from "next/image";
import { cn } from "@/lib/utils/utils";
import { MainButton } from "@/components/common/MainButton";
import { RoomTab } from "./RoomTab";
import { CharacterItem } from "./CharacterItem";

type Props = {
    activeTab: "character" | "skin";
    setActiveTab: (tab: "character" | "skin") => void;
    ownedBases: any[];
    skinsForBase: any[];
    selectedBase: string;
    setSelectedBase: (val: string) => void;
    selectedCharId: number | null;
    setSelectedCharId: (val: number) => void;
    selectedItem: any;
    isCurrentUsed: boolean;
    isEquipping: boolean;
    handleEquip: () => void;
    onPurchaseClick: (item: any) => void;
};

export const RightSidebar = ({
    activeTab,
    setActiveTab,
    ownedBases,
    skinsForBase,
    selectedBase,
    setSelectedBase,
    selectedCharId,
    setSelectedCharId,
    selectedItem,
    isCurrentUsed,
    isEquipping,
    handleEquip,
    onPurchaseClick,
}: Props) => {
    return (
        <aside className="md:w-68 pointer-events-auto relative z-40 flex h-auto min-h-0 w-full flex-1 flex-col overflow-hidden border-l border-[#1F3353] bg-[#172844] md:absolute md:bottom-0 md:right-0 md:top-0 md:h-full md:flex-none">
            {/* TABS */}
            <RoomTab activeTab={activeTab} onChange={setActiveTab} />

            {/* CONTENT AREA */}
            <div className="flex flex-1 flex-col items-center overflow-y-auto px-4 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="mb-6 flex items-center justify-center gap-2 text-center">
                    <div className="h-2 w-2 rotate-45 bg-[#DEBC7F]" />
                    <span className="text-md font-bold text-[#FEA62C] md:text-lg">
                        {activeTab === "character"
                            ? "Semua Karakter"
                            : "Semua Skin"}
                    </span>
                    <div className="h-2 w-2 rotate-45 bg-[#DEBC7F]" />
                </div>

                <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(100px,1fr))] place-items-start gap-4 gap-y-6 pb-6 pl-2">
                    {activeTab === "character"
                        ? ownedBases.map((char) => (
                              <CharacterItem
                                  key={char.character_id}
                                  id={char.character_id}
                                  name={char.base_character}
                                  image_url={char.image_url}
                                  base_character={char.base_character}
                                  isSelected={
                                      selectedBase === char.base_character
                                  }
                                  onClick={() => {
                                      setSelectedBase(char.base_character);
                                      setSelectedCharId(char.character_id);
                                  }}
                              />
                          ))
                        : skinsForBase.map((skin) => (
                              <CharacterItem
                                  key={skin.character_id}
                                  id={skin.character_id}
                                  name={skin.skin_name || skin.base_character}
                                  image_url={skin.image_url}
                                  base_character={skin.base_character}
                                  skin_level={skin.skin_level}
                                  owned={skin.owned}
                                  isSelected={
                                      selectedCharId === skin.character_id
                                  }
                                  onClick={() =>
                                      setSelectedCharId(skin.character_id)
                                  }
                              />
                          ))}
                </div>
            </div>

            {/* FOOTER ACTION */}
            <div className="sticky bottom-2 z-20 flex shrink-0 flex-col gap-3 border-t border-[#1F3353] bg-[#253D66] p-4 md:bottom-0">
                {selectedItem?.owned ? (
                    <MainButton
                        variant="blue"
                        disabled={isCurrentUsed || isEquipping}
                        onClick={handleEquip}
                        className={cn(
                            "h-auto w-full py-3 text-base font-bold transition-all duration-300",
                            isCurrentUsed
                                ? "bg-[#9BA5AB]! text-[#555555]! pointer-events-none opacity-100 shadow-none disabled:opacity-100"
                                : "",
                        )}
                        style={
                            isCurrentUsed
                                ? { boxShadow: "none", transform: "none" }
                                : undefined
                        }
                    >
                        {isEquipping
                            ? "Memproses..."
                            : isCurrentUsed
                            ? "Digunakan"
                            : "Gunakan"}
                    </MainButton>
                ) : (
                    <MainButton
                        variant="blue"
                        onClick={() => onPurchaseClick(selectedItem)}
                        className="flex h-auto w-full items-center justify-center gap-2 py-3 text-base font-bold transition-all duration-300"
                    >
                        <Image
                            src="/icons/coin-color.svg"
                            width={22}
                            height={22}
                            alt="coin"
                            className="transition-transform group-hover:rotate-12"
                        />
                        <span>
                            {selectedItem?.cost?.toLocaleString("id-ID")}
                        </span>
                    </MainButton>
                )}
            </div>
        </aside>
    );
};
