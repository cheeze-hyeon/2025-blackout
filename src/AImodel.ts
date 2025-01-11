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
  const modelId = 'anthropic.claude-3-5-sonnet-20241022-v2:0';
  const inferenceProfile =
    'arn:aws:bedrock:us-east-1:730335373015:inference-profile/us.anthropic.claude-3-5-sonnet-20241022-v2:0';

  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: prompt }],
      },
    ],
  };

  const input = {
    modelId,
    inferenceProfile,
    body: JSON.stringify({ payload }),
    contentType: 'application/json',
  };

  try {
    const command = new InvokeModelCommand(input);
    const response = await bedrockClient.send(command);
    const responseBody = Buffer.from(await response.body).toString('utf-8');
    // console.log(responseBody);
    return responseBody || 'No response from the model.';
  } catch (error) {
    console.error('Error calling Bedrock API:', error);
    return 'Error processing your request.';
  }
}

// Task 수행 함수 생성
export async function requestTranslation(national: string, text: string) {
  const prompt = `Translate the following text to ${national}: \n ${text}`;
  const responseText = await callBedrockModel(prompt);
  return responseText;
}

async function requestInformation(hashtag: string, text: string) {
  const prompt = `Find the information that related to keywords;${hashtag}.\n ${text}`;
  const responseText = await callBedrockModel(prompt);
  return responseText;
}

async function requestHelpService(text: string) {
  const prompt = `You are a pleasant AI assistant. Answer to the given request as much as you can: ${text}`;
  const responseText = await callBedrockModel(prompt);
  return responseText;
}
