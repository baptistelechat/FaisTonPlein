"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { DRAWER_SNAP_POINTS } from "@/lib/constants";
import { SlidersHorizontal } from "lucide-react";
import { SettingsBody } from "./components/SettingsBody";

const StationListSettings = () => {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <Dialog>
        <DialogTrigger render={<Button variant="outline" size="icon" />}>
          <SlidersHorizontal />
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SlidersHorizontal className="size-4" />
              Réglages
            </DialogTitle>
            <DialogDescription>
              Personnalisez votre recherche de stations.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[72vh]">
            <SettingsBody />
          </ScrollArea>
          <div className="flex justify-end pt-2">
            <DialogClose render={<Button variant="outline" />}>
              Fermer
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" size="icon">
          <SlidersHorizontal />
        </Button>
      </DrawerTrigger>
      <DrawerContent
        className="rounded-t-[20px] shadow-2xl"
        style={{ height: `${DRAWER_SNAP_POINTS.EXPANDED * 100}svh` }}
      >
        <DrawerHeader className="text-left!">
          <DrawerTitle className="flex items-center gap-2">
            <SlidersHorizontal className="size-4" />
            Réglages
          </DrawerTitle>
          <DrawerDescription>
            Personnalisez votre recherche de stations.
          </DrawerDescription>
        </DrawerHeader>
        <ScrollArea
          style={{
            height: `calc(${DRAWER_SNAP_POINTS.EXPANDED * 100}svh - 8rem)`,
          }}
        >
          <div className="px-4">
            <SettingsBody />
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
};

export default StationListSettings;
