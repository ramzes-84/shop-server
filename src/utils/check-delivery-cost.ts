export function checkDeliveryCost(
  orderCost: string,
  realCost: string,
): boolean {
  const orderCostFloat = parseFloat(orderCost);
  const realCostFloat = parseFloat(realCost);
  const diff = realCostFloat - orderCostFloat;

  if (diff > 0 && diff / realCostFloat > 0.1) {
    return true;
  } else if (diff < 0 && diff / realCostFloat < -0.1) {
    return true;
  }

  return false;
}
