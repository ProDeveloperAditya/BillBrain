import type { AIMessage, AIResponse, AIProviderInterface } from "./types";

export class GroqProvider implements AIProviderInterface {
  readonly providerName = "GROQ" as const;

  private apiKey: string;

  constructor() {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error("GROQ_API_KEY is not set");
    this.apiKey = key;
  }

  async complete(messages: AIMessage[]): Promise<AIResponse> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Groq = require("groq-sdk");
    const client = new Groq({ apiKey: this.apiKey });

    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.4,
      max_tokens: 800,
    });

    const choice = completion.choices[0];
    return {
      text: choice.message?.content ?? "",
      tokensUsed: completion.usage?.total_tokens ?? 0,
    };
  }
}
