import type { AIMessage, AIResponse, AIProviderInterface } from "./types";

export class OpenAIProvider implements AIProviderInterface {
  readonly providerName = "OPENAI" as const;

  private apiKey: string;

  constructor() {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY is not set");
    this.apiKey = key;
  }

  async complete(messages: AIMessage[]): Promise<AIResponse> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const OpenAI = require("openai");
    const client = new OpenAI({ apiKey: this.apiKey });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
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

  async *stream(messages: AIMessage[]): AsyncIterable<string> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const OpenAI = require("openai");
    const client = new OpenAI({ apiKey: this.apiKey });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.4,
      max_tokens: 800,
      stream: true,
    });

    for await (const chunk of completion) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) yield delta;
    }
  }
}
