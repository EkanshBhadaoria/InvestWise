import { Schema, model, models, type Document, type Model } from "mongoose";

export interface AlertItem extends Document {
  userId: string;
  userEmail: string;
  symbol: string;
  company: string;
  alertName: string;
  alertType: "upper" | "lower" | "volume";
  threshold: number;
  createdAt: Date;
  lastTriggeredAt?: Date;
}

const AlertSchema = new Schema<AlertItem>(
  {
    userId: { type: String, required: true, index: true },
    userEmail: { type: String, required: true, index: true },
    symbol: { type: String, required: true, uppercase: true, trim: true },
    company: { type: String, required: true, trim: true },
    alertName: { type: String, required: true, trim: true },
    alertType: {
      type: String,
      required: true,
      enum: ["upper", "lower", "volume"],
    },
    threshold: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
    lastTriggeredAt: { type: Date },
  },
  { timestamps: false },
);

AlertSchema.index({ userId: 1, symbol: 1, alertType: 1, threshold: 1 });

export const Alert: Model<AlertItem> =
  (models?.Alert as Model<AlertItem>) || model<AlertItem>("Alert", AlertSchema);
