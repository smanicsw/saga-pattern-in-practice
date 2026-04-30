export interface Payment {
  id: string;
  status: "authorized" | "captured" | "refunded" | "failed";
}
