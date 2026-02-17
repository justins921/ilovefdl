interface CommissionItem {
  price: number;
  quantity: number;
}

interface CommissionResult {
  commissionBaseAmount: number;
  commissionAmount: number;
  vendorNetAmount: number;
}

export function calculateCommission(
  items: CommissionItem[],
  commissionRate: number
): CommissionResult {
  const commissionBaseAmount = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const commissionAmount =
    Math.round(commissionBaseAmount * commissionRate * 100) / 100;

  const vendorNetAmount = commissionBaseAmount - commissionAmount;

  return {
    commissionBaseAmount,
    commissionAmount,
    vendorNetAmount,
  };
}
