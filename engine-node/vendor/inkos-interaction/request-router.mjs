import { InteractionRequestSchema } from './intents.mjs';


export function routeInteractionRequest(input) {
  return InteractionRequestSchema.parse(input);
}