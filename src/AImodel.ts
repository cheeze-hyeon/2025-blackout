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
export async function requestIcebreaking(team: string) {
  const prompt = `Given a team name as input, create an icebreaking response designed to lighten the mood and help team members bond. The output should feel natural and casual, like something Korean university students would use in a friendly setting. The tone should be light, fun, and engaging. 

The response must include:
1. A fun or encouraging statement related to the team name to set the tone in the first sentence.  
2. 3-4 questions that are specifically connected to the team name's meaning or characteristics.

Important: Each question should creatively incorporate elements from the team name to make the connection more engaging and natural.

The response should be in ko-KR.

Example Input: "해커톤팀"

Example Output:
해커톤팀 여러분! 48시간의 열정으로 세상을 바꿀 준비 되셨나요? 💻✨

- 여러분의 첫 프로그래밍 경험은 언제였나요? 그때의 기억이 궁금해요!
- 해커톤하면 떠오르는 나만의 필수 아이템이 있다면?
- 만약 이번 해커톤에서 어떤 문제든 해결할 수 있다면, 어떤 문제를 해결하고 싶으신가요?

Alternative example for "봄맞이팀":
안녕하세요 봄맞이팀! 새로운 시작을 함께 할 여러분을 만나서 반가워요 🌱

- 봄이 오면 꼭 하고 싶은 버킷리스트가 있나요?
- 우리 팀에 봄바람 같은 새로운 변화를 준다면 어떤 걸 하고 싶으신가요?
- 인생의 가장 설렘 가득했던 '봄날'은 언제였나요?`;

  const responseText = await callBedrockModel(prompt);
  return responseText;
}

// 오늘의 일상회화 표현현
export async function requestConvers(country: string) {
  const prompt = `Given a country name as input, your task is to provide a practical and commonly used conversational expression or phrase from that country. The phrase should be something that a visitor or new resident might find helpful in everyday interactions, such as asking for help, giving directions, or understanding cultural nuances. Ensure the content is fresh and different for each new request, even for the same country.
Format the output in a way that supports Slack's Markdown formatting. Use bold, italics, and proper indentation for readability. Include the following fields:

=================================================
-*Country*: ${country}
-*Phrase*: "Practical Phrase Here"
-*Meaning and Context*: _Brief Explanation of When and Why to Use This Phrase_
*Example Usage*: Example Sentence Showing How This Phrase Would Be Used in a Real-Life Situation.

Make sure the phrases are both useful and culturally relevant, not just simple greetings or overly generic expressions.
=================================================`;

  const responseText = await callBedrockModel(prompt);
  return responseText;
}

// 그냥 무엇이든 물어봐 느낌의 prompt
export async function requestHelpService(text: string) {
  const prompt = `You are a pleasant AI assistant. Answer to the given request as much as you can: ${text}`;
  const responseText = await callBedrockModel(prompt);
  return responseText;
}

// Information tracking
export async function requestLinkInfo(
  keyword: string,
  data: {
    link: string;
    text: string;
  }[],
) {
  const prompt = `Your task is to identify more relevant (link, text) pair based on a provided keyword. Analyze the content of the text in each pair and select one of them based on their relevance to the keyword. 
  Relevance should be determined by:
  1. How frequently and naturally the keyword or related terms appear in the text.
  2. How closely the content context aligns with the meaning or purpose implied by the keyword.
  3. Any direct mentions or discussions that address key aspects of the keyword.
  Return ONLY the link information, not the text information.
  
  ===================================================
  
  Input: keyword=${keyword}
  Pairs: ${data}

  Output Format: 
  More relevant Link: "Most Relevant Link here" `;

  const responseText = await callBedrockModel(prompt);
  return responseText;
}

export async function requestInformation(text: string) {
  const prompt = `Your task is to take unstructured text input obtained from crawling various sources and refine it into a well-organized, concise notification that helps users quickly understand the essential points. Summarize the key details in a way that removes unnecessary repetition. Maintain a tone suitable for notifications—short, direct, and informative.
  ==========================================
  Input: ${text}
  Output Format: 
  Title: "A brief title summarizing the main topic in 1 line here"
  Contents: "summarized key inforation based in given text"`;
  const responseText = await callBedrockModel(prompt);
  return responseText;
}
