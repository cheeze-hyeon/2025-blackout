import express, { Request, Response } from 'express';
import axios from 'axios';
import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import { boltApp } from '.';
import { BedrockClient } from '@aws-sdk/client-bedrock';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

// BedrockClient
const bedrockClient = new BedrockRuntimeClient({ region: 'us-east-1' });

// AWS Bedrock 함수
async function callBedrockModel(prompt: string): Promise<string> {
  const modelId = 'anthropic.claude-3-5-sonnet-20240620-v1:0';
  const input = {
    modelId,
    body: JSON.stringify({
      messages: [
        { role: 'user', content: prompt }, // 사용자 입력
      ],
      max_tokens: 1024, // 응답의 최대 길이 (토큰 수)
      temperature: 0.7, // 응답의 무작위성 (0~1 범위)
      anthropic_version: 'bedrock-2023-05-31',
    }),
    contentType: 'application/json',
  };

  try {
    const command = new InvokeModelCommand(input);
    const response = await bedrockClient.send(command);
    const responseBody = Buffer.from(await response.body).toString('utf-8');
    const responseObject = JSON.parse(responseBody);
    const contentArray = responseObject?.content || [];
    const textContent = contentArray
      .filter((item: any) => item.type === 'text') // "text" 타입 필터링
      .map((item: any) => item.text) // "text" 필드만 추출
      .join('\n'); // 여러 개의 text가 있을 경우 줄바꿈으로 연결

    return textContent || 'No response from the model.';
  } catch (error) {
    console.error('Error calling Bedrock API:', error);
    return 'Error processing your request.';
  }
}

// Task 수행 함수 생성
// 번역 기능능
export async function requestTranslation(national: string, text: string) {
  const prompt = `Translate the following text to ${national}: \n ${text}\nONLY return the translated text of the given text and do not add additional words.`;
  const responseText = await callBedrockModel(prompt);
  return responseText;
}

// Icebreaking 봇봇
async function requestIcebreaking(team: string) {
  const prompt = `Given a team name as input, your task is to create an icebreaking output designed to lighten the atmosphere and foster team bonding. The response should include:
  1. A fun or encouraging statement related to the team name to set the tone at first sentence.
  2. A set of questions or topics that help team members learn more about each other in a friendly, engaging way.
  Given team name: ${team}

  ================================================================
  Example format of icebreaking; if the team name is 'Blue Hawks':

  Blue Hawks always soar higher! Let’s find out what makes each of us soar!
  Ask your team members:
  - What’s your dream adventure or "soaring" moment?
  - If you could pick any superpower that represents a hawk’s vision or speed, what would it be and why?
  - What’s the best team experience you’ve ever had and why did it stand out?`;

  const responseText = await callBedrockModel(prompt);
  return responseText;
}

// 오늘의 일상회화 표현현
async function requestConvers(country: string) {
  const prompt = `Given a country name as input, your task is to provide a simple, everyday conversational expression or phrase commonly used in that country. Include a brief explanation of its meaning and context (e.g., greeting, thanking, casual talk). Ensure the content is fresh and different for each new request, even for the same country.

  =================================================
  Format the output as follows:

  Country: ${country}
  Phrase: "Phrase here"
  Meaning and Context: "Brief Explanation here"
  Example Usage: "Example Sentence here"\n`;

  const responseText = await callBedrockModel(prompt);
  return responseText;
}

// 그냥 무엇이든 물어봐 느낌의 prompt
async function requestHelpService(text: string) {
  const prompt = `You are a pleasant AI assistant. Answer to the given request as much as you can: ${text}`;
  const responseText = await callBedrockModel(prompt);
  return responseText;
}

async function requestInformation(hashtag: string, text: string) {
  const prompt = `Find the information that related to keywords;${hashtag}.\n${text}`;
  const responseText = await callBedrockModel(prompt);
  return responseText;
}
