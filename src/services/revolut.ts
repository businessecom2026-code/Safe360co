// ─── Types ───────────────────────────────────────────────────────────────────

export interface RevolutError {
  stage: 'order_creation' | 'sdk_init' | 'popup' | 'cancel' | 'network';
  httpStatus?: number;
  revolutCode?: string;
  rawMessage: string;
}

export interface RevolutCheckoutHandle {
  instance: any;
  orderId: string;
  merchantRef: string;
}

// ─── prepareRevolutCheckout ───────────────────────────────────────────────────
// Call this ASYNCHRONOUSLY when the payment modal opens — NOT in the click handler.
// It creates the Revolut order server-side and initialises the SDK widget instance.
// Cache the returned handle; pass it to openRevolutPopup() on the actual click.
export const prepareRevolutCheckout = async (
  amount: number,
  currency: string,
  userId: string,
  plan: string,
  description: string = 'Safe360 Payment'
): Promise<RevolutCheckoutHandle> => {
  // Step 1: Create order on server (sets capture_mode + merchant_order_ext_ref)
  let res: Response;
  try {
    res = await fetch('/api/payments/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, currency, description, userId, plan }),
    });
  } catch (err: any) {
    throw {
      stage: 'network',
      rawMessage: err?.message || 'Network error — could not reach payment server',
    } satisfies RevolutError;
  }

  if (!res.ok) {
    let body: any = {};
    try { body = await res.json(); } catch { /* ignore parse error */ }
    console.error('[revolut] Order creation failed:', { status: res.status, body });
    throw {
      stage: 'order_creation',
      httpStatus: res.status,
      rawMessage: body?.error?.message || body?.message || `Server returned ${res.status}`,
    } satisfies RevolutError;
  }

  const { publicId, env, orderId, merchantRef } = await res.json();

  // Step 2: Initialise Revolut Checkout SDK with the order's public_id
  let instance: any;
  try {
    const { default: RevolutCheckout } = await import('@revolut/checkout');
    instance = await RevolutCheckout(publicId, env);
  } catch (err: any) {
    console.error('[revolut] SDK init failed:', err);
    throw {
      stage: 'sdk_init',
      rawMessage: err?.message || 'Failed to initialise Revolut Checkout SDK',
    } satisfies RevolutError;
  }

  return { instance, orderId, merchantRef };
};

// ─── openRevolutPopup ────────────────────────────────────────────────────────
// Call this SYNCHRONOUSLY inside the click event handler.
// Because all async work is done in prepareRevolutCheckout(), the browser
// correctly recognises this call as a direct user gesture and allows the popup.
export const openRevolutPopup = (
  handle: RevolutCheckoutHandle,
  onSuccess: () => void,
  onError: (error: RevolutError) => void
): void => {
  handle.instance.payWithPopup({
    onSuccess() {
      onSuccess();
    },
    onError(error: any) {
      console.error('[revolut] Widget error:', { code: error?.code, message: error?.message });
      onError({
        stage: 'popup',
        revolutCode: error?.code,
        rawMessage: error?.message || 'Payment widget error',
      });
    },
    onCancel() {
      onError({ stage: 'cancel', rawMessage: 'Payment cancelled by user.' });
    },
  });
};
