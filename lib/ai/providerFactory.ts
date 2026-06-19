import type { AIProviderInterface } from "./types";
import { DemoProvider } from "./demoProvider";

let _cached: AIProviderInterface | null = null;

export function getProvider(): AIProviderInterface {
  if (_cached) return _cached;

  const requested = (process.env.AI_PROVIDER ?? "").toLowerCase();

  // Explicit override takes priority
  if (requested === "demo") {
    return (_cached = new DemoProvider());
  }

  if ((requested === "openai" || !requested) && process.env.OPENAI_API_KEY) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { OpenAIProvider } = require("./openaiProvider") as { OpenAIProvider: new () => AIProviderInterface };
      return (_cached = new OpenAIProvider());
    } catch {
      console.warn("BillBrain: OpenAI SDK not available, falling back to demo");
    }
  }

  if ((requested === "groq" || !requested) && process.env.GROQ_API_KEY) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { GroqProvider } = require("./groqProvider") as { GroqProvider: new () => AIProviderInterface };
      return (_cached = new GroqProvider());
    } catch {
      console.warn("BillBrain: Groq SDK not available, falling back to demo");
    }
  }

  return (_cached = new DemoProvider());
}

/** Reset cached provider — useful in tests or after env changes. */
export function resetProvider(): void {
  _cached = null;
}
