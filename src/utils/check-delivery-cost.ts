export function checkDeliveryCost(
  orderCost: string,
  realCost: string,
): boolean {
  const orderCostFloat = parseFloat(orderCost);
  const realCostFloat = parseFloat(realCost);
  const diff = realCostFloat - orderCostFloat;

  return diff > 0 && (diff / realCostFloat > 0.1 || diff / realCostFloat < 0.1);
}
