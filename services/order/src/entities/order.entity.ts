export interface Order {
  id: string;
  status: "pending" | "confirmed" | "cancelled";
}
