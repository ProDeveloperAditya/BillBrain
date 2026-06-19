export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIResponse {
  text: string;
  tokensUsed: number;
}

/** Every concrete provider implements this interface. */
export interface AIProviderInterface {
  readonly providerName: "OPENAI" | "GROQ" | "DEMO";
  complete(messages: AIMessage[]): Promise<AIResponse>;
}
