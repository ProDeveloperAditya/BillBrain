export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIResponse {
  text: string;
  tokensUsed: number;
}

/** A transaction the assistant used to ground its answer (source-panel citation). */
export interface Citation {
  id: string;
  date: string;          // ISO YYYY-MM-DD
  merchant: string;
  amount: number;
  type: "DEBIT" | "CREDIT";
  category: string;
}

/** Every concrete provider implements this interface. */
export interface AIProviderInterface {
  readonly providerName: "OPENAI" | "GROQ" | "DEMO";
  complete(messages: AIMessage[]): Promise<AIResponse>;
  /** Yields incremental text deltas. Concatenation of deltas === complete().text. */
  stream(messages: AIMessage[]): AsyncIterable<string>;
}
