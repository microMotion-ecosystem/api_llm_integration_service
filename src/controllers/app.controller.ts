import {
  Controller,
  Get,
  UseGuards,
  Post,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { AppService } from '../services/app.service';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../core/jwt-auth-guard/jwt-auth.guard';
import { OpenAiService } from 'src/services/open-ai.service';
import { GeminiAiService } from 'src/services/gemini.service';
import { ResponseDto } from 'src/dtos/response.dto';
import { MODEL } from 'src/types/enum';
import { DeepseekService } from 'src/services/deepseek.service';
import { QueryModelDto } from 'src/dtos/query-model-dto';

import { ClaudeAiService } from 'src/services/claude.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { v4 as uuidv4 } from 'uuid';
import { Stream } from 'node:stream';
import { FileInterceptor } from '@nestjs/platform-express';

//import { Multer } from 'multer'; // Import Multer types
import { Express } from 'express';
import { Multer } from 'multer'; // Import Multer types
import { AskLLMDto } from 'src/dtos/ask-llm.dto';
import { systemMessages } from 'src/types/system-messages';

@Controller('api/v1')
export class AppController {
  constructor(
    private readonly openAiService: OpenAiService,
    private readonly geminiService: GeminiAiService,
    private readonly deepseekService: DeepseekService,
    private readonly claudeAiService: ClaudeAiService,
  ) {}

  // we can use like this for ai agents.
  @MessagePattern('call-llm')
  async sendHabbit(data: { message: string; llmType: string }) {
    let answer;

    console.log(data)
    const messages: Array<{role: "user" | "assistant" | "system", content: string}> = [];
    messages.push({role: 'system', content: systemMessages[0]});
    messages.push({role: 'user', content: data.message});
    if (data.llmType == MODEL.OPENAI) {
      answer = await this.openAiService.getChatGptResponse(messages);
    } else if (data.llmType == MODEL.GEMINI) {
      answer = await this.geminiService.generateContent('', messages);
    } else if (data.llmType == MODEL.DEEPSEEK) {
      answer = await this.deepseekService.askDeepseek(messages);
    } else if (data.llmType == MODEL.CLAUDE) {
      answer = await this.claudeAiService.generateContent(messages);
    } else {
      answer = { success: false };
    }
    console.log(answer.chatResponse)
    return {success: true, data: answer.chatResponse};
  }
  @MessagePattern('send-prompt')
  async sendPrmpt(data: {message: string, llmType:string}) {
    let answer;
    console.log(data)
    const messages: Array<{role: "user" | "assistant" | "system", content: string}> = [];
    messages.push({role: 'user', content: data.message});
    if (data.llmType == MODEL.OPENAI) {
      answer = await this.openAiService.getChatGptResponse(messages);
    } else if (data.llmType == MODEL.GEMINI) {
      answer = await this.geminiService.generateContent('', messages);
    } else if(data.llmType == MODEL.DEEPSEEK){
      answer = await this.deepseekService.askDeepseek(messages);
    } else if(data.llmType == MODEL.CLAUDE){
      answer = await this.claudeAiService.generateContent(messages);
    } else {
      answer = { success: false }
    }
    console.log(answer.chatResponse)
    return {success: true, data: answer.chatResponse};
  }

  // this MessagePattern is for chat app.
  // this MessagePattern is for chat app.
  // this MessagePattern is for chat app.
  @MessagePattern('ask-llm')
  async askLlm(data: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    llmType: string;
    sessionId?: string;
    stream?: boolean;
  }) {
    let answer;
    // console.log(data)
    if (data.stream === true) {
      console.log('streaming answer');
      answer = await this.deepseekService.askDeepseekStream(
        data.messages,
        data.sessionId,
      );
    } else {
      if (data.llmType == MODEL.OPENAI) {
        answer = await this.openAiService.getChatGptResponse(data.messages);
      } else if (data.llmType == MODEL.GEMINI) {
        answer = await this.geminiService.generateContent(
          data.sessionId,
          data.messages,
        );
      } else if (data.llmType == MODEL.DEEPSEEK) {
        answer = await this.deepseekService.askDeepseek(data.messages);
      } else if (data.llmType == MODEL.CLAUDE) {
        answer = await this.claudeAiService.generateContent(data.messages);
      } else {
        answer = { success: false };
      }
    }
    return { success: true, data: answer };
  }

  @Post('/llm/:llm_type')
  @ApiOperation({summary: 'send message to llm and get the answer'})
  @ApiParam({
      name: 'llm_type',
      description: 'type of llm you want to respond to the message',
      type: QueryModelDto
  })
  @ApiBody({
      type: AskLLMDto,
  })
  @ApiResponse({
      status: 200,
      description: 'successfully send prompt to llm and successfully get response'
  })
  async chat(
    @Body() body: AskLLMDto,
    @Param() llm_type: QueryModelDto,
  ) {
    try {
      let answer;
      let llmMessage: Array<{role: "user" | "assistant" | 'system', content: string}> = [] 
      const systemMessage = 'for any question from user respond with "HahahaHaha"'
      llmMessage.push({role: 'system', content: systemMessage});
      llmMessage.push({role: 'user', content: body.message});
      if(llm_type.llm_type === MODEL.DEEPSEEK){
        answer = await this.deepseekService.askDeepseek(llmMessage);
      } else if (llm_type.llm_type === MODEL.GEMINI) {
        answer = await this.geminiService.generateContent('', llmMessage);
      } else if (llm_type.llm_type === MODEL.OPENAI) {
        answer = await this.openAiService.getChatGptResponse(llmMessage);
      } else if (llm_type.llm_type === MODEL.CLAUDE) {
        answer = await this.claudeAiService.generateContent(llmMessage);
      }
      return ResponseDto.ok(answer.chatResponse);
    } catch (error) {
      console.log(error) 
      return ResponseDto.throwBadRequest(error.message, error);
    }
  }
  //endpoint to audio file
  @Post('/pronunciation-analysis/:llm_type')
  @UseInterceptors(FileInterceptor('audio'))
  async analyzePronunciation(
    @UploadedFile() audioFile: Express.Multer.File,
    @Body() body: { language: string },
    @Param() llm_type: QueryModelDto,
  ) {
    try {
      const systemMessage = `You are a pronunciation expert. Analyze the user's speech in ${body.language} and provide feedback on: 
      - Phonetic accuracy
      - Intonation patterns
      - Common errors
      - Suggestions for improvement
      Format response using markdown with sections for each analysis category.`;

      let answer;
      console.log('Uploaded file:', audioFile);

      const transcription = await this.openAiService.transcribeAudio(
        audioFile.buffer,
      );

      const messages: Array<{
        role: 'user' | 'assistant' | 'system';
        content: string;
      }> = [
        { role: 'system', content: systemMessage },
        { role: 'user', content: transcription },
      ];

      if (llm_type.llm_type === MODEL.OPENAI) {
        answer = await this.openAiService.getChatGptResponse(messages);
      } else if (llm_type.llm_type === MODEL.DEEPSEEK) {
        answer = await this.deepseekService.askDeepseek(messages);
      }

      return ResponseDto.ok(answer.chatResponse);
    } catch (error) {
      return ResponseDto.throwBadRequest(error.message, error);
    }
  }

}
