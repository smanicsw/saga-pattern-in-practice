export type AuthorizePaymentProviderInput = {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  paymentMethodToken?: string;
};

export type AuthorizePaymentProviderResult =
  | {
      approved: true;
      providerRef: string;
    }
  | {
      approved: false;
      failureReason: Record<string, unknown>;
    };

const DECLINE_TOKENS = new Set([
  "card_declined",
  "fail",
  "failed",
  "insufficient_funds",
]);

export async function authorizePayment({
  paymentId,
  paymentMethodToken,
}: AuthorizePaymentProviderInput): Promise<AuthorizePaymentProviderResult> {
  const normalizedToken = paymentMethodToken?.trim().toLowerCase();

  if (normalizedToken && DECLINE_TOKENS.has(normalizedToken)) {
    return {
      approved: false,
      failureReason: {
        code: normalizedToken,
        message: "Fake provider declined the payment.",
      },
    };
  }

  return {
    approved: true,
    providerRef: `fake-auth-${paymentId}`,
  };
}
