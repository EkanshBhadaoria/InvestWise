"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/better-auth/auth";
import { connectToDatabase } from "@/database/mongoose";
import { Alert as AlertModel } from "@/database/models/alert.model";
import { revalidatePath } from "next/cache";

const getSessionUser = async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ? session.user : null;
};

export const getAlertsForUser = async (): Promise<Alert[]> => {
  const user = await getSessionUser();
  if (!user) return [];

  await connectToDatabase();
  const alerts = await AlertModel.find({ userId: user.id })
    .sort({ createdAt: -1 })
    .lean();

  return alerts.map((alert) => ({
    id: String(alert._id),
    symbol: alert.symbol,
    company: alert.company,
    alertName: alert.alertName,
    currentPrice: 0,
    alertType: alert.alertType,
    threshold: alert.threshold,
  }));
};

export const createAlert = async (data: AlertData) => {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const threshold = Number(data.threshold);
  if (
    !data.symbol ||
    !data.company ||
    !data.alertName ||
    !data.alertType ||
    !Number.isFinite(threshold)
  ) {
    throw new Error("Invalid alert data");
  }

  await connectToDatabase();
  await AlertModel.create({
    userId: user.id,
    userEmail: user.email,
    symbol: data.symbol,
    company: data.company,
    alertName: data.alertName,
    alertType: data.alertType,
    threshold,
  });

  revalidatePath("/watchlist");
};

export const updateAlert = async (alertId: string, data: AlertData) => {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const threshold = Number(data.threshold);
  if (!alertId || !Number.isFinite(threshold)) {
    throw new Error("Invalid alert data");
  }

  await connectToDatabase();
  await AlertModel.findOneAndUpdate(
    { _id: alertId, userId: user.id },
    {
      alertName: data.alertName,
      alertType: data.alertType,
      threshold,
    },
  );

  revalidatePath("/watchlist");
};

export const deleteAlert = async (alertId: string) => {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  await connectToDatabase();
  await AlertModel.deleteOne({ _id: alertId, userId: user.id });

  revalidatePath("/watchlist");
};
