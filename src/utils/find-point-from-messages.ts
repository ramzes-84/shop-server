import { CustomerMessagesResDto } from 'src/shop/dto/order-info.dto';

function extractPointId(message: string) {
  return message.slice(message.indexOf('[ID: ') + 5, message.indexOf(']'));
}

export function findPointId(
  messages: CustomerMessagesResDto['customer_messages'],
) {
  const finalMsgWithPointId = messages.find((message) =>
    message.message.includes('[ID: '),
  );
  if (finalMsgWithPointId) {
    return extractPointId(finalMsgWithPointId.message);
  }
}
