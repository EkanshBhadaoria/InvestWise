"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ALERT_TYPE_OPTIONS } from "@/lib/constants";
import { createAlert, updateAlert } from "@/lib/actions/alert.actions";

const defaultForm: AlertData = {
  symbol: "",
  company: "",
  alertName: "",
  alertType: "upper",
  threshold: "",
};

const AlertModal = ({ alertId, alertData, open, setOpen }: AlertModalProps) => {
  const [form, setForm] = useState<AlertData>(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(alertData || defaultForm);
    }
  }, [alertData, open]);

  const isEdit = Boolean(alertId);

  const handleSave = async () => {
    if (!form.symbol || !form.company || !form.alertName || !form.threshold)
      return;

    setSaving(true);
    try {
      if (isEdit && alertId) {
        await updateAlert(alertId, form);
      } else {
        await createAlert(form);
      }
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const thresholdLabel =
    form.alertType === "volume"
      ? "Volume threshold (shares)"
      : "Price threshold (USD)";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="alert-dialog">
        <DialogHeader>
          <DialogTitle className="alert-title">
            {isEdit ? "Update alert" : "Create alert"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="form-label" htmlFor="alert-name">
              Alert name
            </label>
            <Input
              id="alert-name"
              value={form.alertName}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, alertName: event.target.value }))
              }
              className="form-input"
              placeholder="e.g. NVDA breakout"
            />
          </div>

          <div className="space-y-2">
            <label className="form-label">Alert type</label>
            <Select
              value={form.alertType}
              onValueChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  alertType: value as AlertData["alertType"],
                }))
              }
            >
              <SelectTrigger className="select-trigger">
                <SelectValue placeholder="Select alert type" />
              </SelectTrigger>
              <SelectContent>
                {ALERT_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="form-label" htmlFor="alert-threshold">
              {thresholdLabel}
            </label>
            <Input
              id="alert-threshold"
              type="number"
              min={0}
              step={form.alertType === "volume" ? 1 : 0.01}
              value={form.threshold}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, threshold: event.target.value }))
              }
              className="form-input"
              placeholder={
                form.alertType === "volume" ? "e.g. 5000000" : "e.g. 430.50"
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => setOpen(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !form.alertName || !form.threshold}
            className="yellow-btn"
          >
            {saving ? "Saving..." : isEdit ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AlertModal;
