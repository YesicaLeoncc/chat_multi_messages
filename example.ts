// dto/webhook.dto.ts
export interface WhatsappWebhookBody {
object: 'whatsapp_business_account';
entry: Array<{
id: string;
changes: Array<{
field: 'messages';
value: {
messaging_product: 'whatsapp';
metadata: { display_phone_number: string; phone_number_id: string };
contacts?: any[];
messages?: Array<{
id: string; // wamid
from: string;
timestamp: string;
type: 'text' | 'image' | 'audio' | 'video' | string;
text?: { body: string };
image?: { id?: string; mime_type?: string; caption?: string };
// ...otros tipos
}>;
statuses?: Array<{
id: string; // wamid del mensaje enviado
status: 'sent' | 'delivered' | 'read' | 'failed';
timestamp: string;
recipient_id: string;
conversation?: any;
pricing?: any;
errors?: any[];
}>;
};
}>;
}>;
}