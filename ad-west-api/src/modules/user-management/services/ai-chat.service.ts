import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AuthPrincipal } from '../interfaces/auth-principal.interface';

interface AiChatResponse {
  answer: string;
  provider: 'openai' | 'ollama';
  model: string;
}

@Injectable()
export class AiChatService {
  async chat(principal: AuthPrincipal, message: string, context?: string): Promise<AiChatResponse> {
    const normalizedMessage = message.trim();
    if (!normalizedMessage) {
      throw new ServiceUnavailableException('Prompt is required.');
    }

    const provider = (process.env.AI_CHAT_PROVIDER ?? 'ollama').trim().toLowerCase();
    if (provider === 'openai') {
      return this.callOpenAi(principal, normalizedMessage, context);
    }
    return this.callOllama(principal, normalizedMessage, context);
  }

  private async callOpenAi(principal: AuthPrincipal, message: string, context?: string): Promise<AiChatResponse> {
    const apiKey = (process.env.AI_OPENAI_API_KEY ?? '').trim();
    if (!apiKey) {
      throw new ServiceUnavailableException('AI chat is not configured. Set AI_OPENAI_API_KEY or switch AI_CHAT_PROVIDER to ollama.');
    }

    const model = (process.env.AI_OPENAI_MODEL ?? 'gpt-4o-mini').trim();
    const baseUrl = (process.env.AI_OPENAI_BASE_URL ?? 'https://api.openai.com/v1').trim().replace(/\/+$/, '');

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.25,
        messages: this.buildMessages(principal, message, context),
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new ServiceUnavailableException(`AI provider error: ${text || response.statusText}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const answer = data.choices?.[0]?.message?.content?.trim();
    if (!answer) {
      throw new ServiceUnavailableException('AI provider returned an empty response.');
    }

    return { answer, provider: 'openai', model };
  }

  private async callOllama(principal: AuthPrincipal, message: string, context?: string): Promise<AiChatResponse> {
    const model = (process.env.AI_OLLAMA_MODEL ?? 'llama3.1:8b').trim();
    const baseUrl = (process.env.AI_OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434').trim().replace(/\/+$/, '');

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        stream: false,
        options: { temperature: 0.25 },
        messages: this.buildMessages(principal, message, context),
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new ServiceUnavailableException(`AI provider error: ${text || response.statusText}`);
    }

    const data = (await response.json()) as {
      message?: { content?: string };
    };

    const answer = data.message?.content?.trim();
    if (!answer) {
      throw new ServiceUnavailableException('AI provider returned an empty response.');
    }

    return { answer, provider: 'ollama', model };
  }

  private buildMessages(principal: AuthPrincipal, message: string, context?: string): Array<{ role: 'system' | 'user'; content: string }> {
    const roleSummary = (principal.roles ?? []).join(', ') || 'admin';
    const contextBlock = context?.trim() ? `\n\nAvailable context:\n${context.trim()}` : '';

    return [
      {
        role: 'system',
        content:
          'You are AD West Governance Assistant. Give concise, actionable insights from the provided context. If context is missing, clearly say what data is needed. Avoid hallucinating numbers and mention assumptions.',
      },
      {
        role: 'user',
        content: `User role: ${roleSummary}${contextBlock}\n\nQuestion: ${message}`,
      },
    ];
  }
}
