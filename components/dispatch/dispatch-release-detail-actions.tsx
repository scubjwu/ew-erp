"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  cancelDispatchRelease,
  holdDispatchRelease,
  resumeDispatchRelease,
} from "@/app/dispatch/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";

type Props = {
  transferOrderId: string;
  orderNo: string;
  status: string;
  releaseQty: number;
  pickedUpQty: number;
};

export function DispatchReleaseDetailActions({
  transferOrderId,
  orderNo,
  status,
  releaseQty,
  pickedUpQty,
}: Props) {
  const router = useRouter();
  const [holdDialogOpen, setHoldDialogOpen] = useState(false);
  const [holdReason, setHoldReason] = useState("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelMode, setCancelMode] = useState<"FULL" | "PARTIAL">("FULL");
  const [cancelQty, setCancelQty] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canHold = status === "CREATED" || status === "IN_TRANSIT";
  const canResume = status === "ON_HOLD";
  const canCancel = status === "CREATED" || status === "IN_TRANSIT" || status === "ON_HOLD";
  const maxPartialCancelQty = Math.max(0, releaseQty - pickedUpQty);

  async function submitHold() {
    if (!holdReason.trim()) {
      toast({
        variant: "destructive",
        title: "Hold Reason is required",
        description: "Please enter the reason before holding this release.",
      });
      return;
    }

    setSubmitting(true);
    try {
      await holdDispatchRelease({ transferOrderId, holdReason: holdReason.trim() });
      toast({
        title: "Dispatch Release placed on hold",
        description: `Release ${orderNo} is now on hold.`,
      });
      setHoldDialogOpen(false);
      setHoldReason("");
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not hold Dispatch Release",
        description: getErrorMessage(error),
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function submitResume() {
    setSubmitting(true);
    try {
      await resumeDispatchRelease(transferOrderId);
      toast({
        title: "Dispatch Release resumed",
        description: `Release ${orderNo} is active again.`,
      });
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not resume Dispatch Release",
        description: getErrorMessage(error),
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function submitCancel() {
    if (!cancelReason.trim()) {
      toast({
        variant: "destructive",
        title: "Cancel Reason is required",
        description: "Please enter the reason before cancelling this release.",
      });
      return;
    }

    const parsedCancelQty =
      cancelMode === "PARTIAL" ? Number.parseInt(cancelQty.trim(), 10) : null;
    if (cancelMode === "PARTIAL") {
      if (!Number.isFinite(parsedCancelQty) || parsedCancelQty == null || parsedCancelQty <= 0) {
        toast({
          variant: "destructive",
          title: "Cancel Quantity is invalid",
          description: "Please enter a positive whole number.",
        });
        return;
      }
      if (parsedCancelQty > maxPartialCancelQty) {
        toast({
          variant: "destructive",
          title: "Cancel Quantity is too large",
          description: `You can cancel at most ${maxPartialCancelQty} units from this release.`,
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      await cancelDispatchRelease({
        transferOrderId,
        cancelQty: cancelMode === "PARTIAL" ? parsedCancelQty : null,
        cancelReason: cancelReason.trim(),
      });
      toast({
        title: "Dispatch Release cancelled",
        description:
          cancelMode === "FULL"
            ? `Release ${orderNo} was cancelled.`
            : `Release ${orderNo} was partially cancelled.`,
      });
      setCancelDialogOpen(false);
      setCancelMode("FULL");
      setCancelQty("");
      setCancelReason("");
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not cancel Dispatch Release",
        description: getErrorMessage(error),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/dispatch/dispatch-release">Back to Dispatch Release Management</Link>
        </Button>
        {status !== "CANCELLED" && status !== "COMPLETED" ? (
          <Button asChild variant="outline">
            <Link href={`/dispatch/dispatch-release/${transferOrderId}/edit`}>Edit</Link>
          </Button>
        ) : null}
        {canHold ? (
          <Button variant="outline" onClick={() => setHoldDialogOpen(true)}>
            Hold
          </Button>
        ) : null}
        {canResume ? (
          <Button variant="outline" onClick={() => void submitResume()} disabled={submitting}>
            Resume
          </Button>
        ) : null}
        {canCancel ? (
          <Button variant="destructive" onClick={() => setCancelDialogOpen(true)}>
            Cancel
          </Button>
        ) : null}
      </div>

      <Dialog open={holdDialogOpen} onOpenChange={setHoldDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Hold Dispatch Release</DialogTitle>
            <DialogDescription>
              Enter the reason for putting release {orderNo} on hold.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="dispatch-release-hold-reason">Hold Reason</Label>
            <Textarea
              id="dispatch-release-hold-reason"
              rows={4}
              value={holdReason}
              onChange={(event) => setHoldReason(event.target.value)}
              placeholder="Describe why this release is on hold"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHoldDialogOpen(false)} disabled={submitting}>
              Close
            </Button>
            <Button onClick={() => void submitHold()} disabled={submitting}>
              Confirm Hold
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cancel Dispatch Release</DialogTitle>
            <DialogDescription>
              Cancel all or part of release {orderNo}. Remaining effective quantity will be reduced.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cancel Mode</Label>
              <Select value={cancelMode} onValueChange={(value) => setCancelMode(value as "FULL" | "PARTIAL")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL">Full Cancel</SelectItem>
                  <SelectItem value="PARTIAL">Partial Cancel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {cancelMode === "PARTIAL" ? (
              <div className="space-y-2">
                <Label htmlFor="dispatch-release-cancel-qty">Cancel Quantity</Label>
                <Input
                  id="dispatch-release-cancel-qty"
                  type="number"
                  min={1}
                  max={maxPartialCancelQty}
                  value={cancelQty}
                  onChange={(event) => setCancelQty(event.target.value)}
                  placeholder={`Max ${maxPartialCancelQty}`}
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="dispatch-release-cancel-reason">Cancel Reason</Label>
              <Textarea
                id="dispatch-release-cancel-reason"
                rows={4}
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                placeholder="Describe why this release is being cancelled"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)} disabled={submitting}>
              Close
            </Button>
            <Button variant="destructive" onClick={() => void submitCancel()} disabled={submitting}>
              Confirm Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
