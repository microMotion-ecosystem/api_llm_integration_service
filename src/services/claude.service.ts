import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
@Injectable()
export class ClaudeAiService {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async generateContent(message: string) {
    if (!message) {
      throw new NotFoundException('Message must be provided');
    }
    try {
      const result = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{ role: 'user', content: message }],
      });
      //   const message = {
      //     id: 'msg_01XFDUDYJgAACzvnptvVoYEL',
      //     type: 'message',
      //     role: 'assistant',
      //     content: [
      //       {
      //         type: 'text',
      //         text: 'Hello!',
      //       },
      //     ],
      //     model: 'claude-3-5-sonnet-20241022',
      //     stop_reason: 'end_turn',
      //     stop_sequence: null,
      //     usage: {
      //       input_tokens: 12,
      //       output_tokens: 6,
      //     },
      //   };
      return result.content[0]['text'];
    } catch (error) {
      //console.log(error);
      throw new InternalServerErrorException(`Failed to generate content`);
    }
  }
}
