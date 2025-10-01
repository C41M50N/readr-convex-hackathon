import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAddContentModal } from "@/stores";
import { useConvexAction } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import React from "react";
import { toast } from "sonner";

function isUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

type AddContentDialogProps = {};

export function AddContentDialog(props: AddContentDialogProps) {
  const modalStateStore = useAddContentModal();
  const [value, setValue] = React.useState("");
  const { mutateAsync: ingest } = useMutation({
    mutationFn: useConvexAction(api.ingestion.ingest),
    onSuccess: () => {
      toast("Ingestion started, this may take up to 5 minutes.");
      setValue("");
      modalStateStore.set("closed");
    },
  });

  function onEnter() {
    if (isUrl(value.trim())) {
      ingest({ url: value.trim() });
    }
  }

  return (
    <Dialog
      onOpenChange={(open) => !open && modalStateStore.set("closed")}
      open={modalStateStore.state === "open"}
    >
      <DialogTrigger asChild>
        <Button onClick={() => modalStateStore.set("open")}>+ add content</Button>
      </DialogTrigger>
      <DialogContent showCloseButton={false} className="top-[10%]">
        <Input
          placeholder="Enter URL"
          className="w-full"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => (e.key === "Enter" ? onEnter() : null)}
        />
      </DialogContent>
    </Dialog>
  );
}
