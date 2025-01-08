import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiAiService {
  private readonly model;

  constructor() {
    const genAI = new GoogleGenerativeAI(process.env.Gemini_Api);
    this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async generateContent(message: string): Promise<string> {
    if (!message) {
      throw new NotFoundException('Message must be provided');
    }
    try {
      const result = await this.model.generateContent(message);
      return result.response.text();
    } catch (err) {
      console.error('Error generating content:', err);
      throw new InternalServerErrorException('Failed to generate content');
    }
  }
}
