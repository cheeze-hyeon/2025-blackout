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

// Custom prompt 목록
// const prompts: Record<string, string> = {
//   greeting: 'You are a friendly assistant. Respond in a cheerful way:',
//   summary: 'Summarize the following text in a concise manner:',
//   customAI: 'Perform custom AI logic based on:',
// };

// AWS Bedrock 함수
async function callBedrockModel(prompt: string): Promise<string> {
  const modelId = 'anthropic.claude-3-5-sonnet-20241022-v2:0';
  const input = {
    modelId,
    body: JSON.stringify({ prompt }),
    contentType: 'application/json',
  };

  try {
    const command = new InvokeModelCommand(input);
    const response = await bedrockClient.send(command);
    const responseBody = Buffer.from(await response.body).toString('utf-8');
    console.log(responseBody);
    return responseBody || 'No response from the model.';
  } catch (error) {
    console.error('Error calling Bedrock API:', error);
    return 'Error processing your request.';
  }
}

// Task 수행 함수 생성
async function requestTranslation(national: string, text: string) {
  const prompt = `Translate the following text to ${national}: \n ${text}`;
  const responseText = await callBedrockModel(prompt);
}

async function requestInformation(national: string, text: string) {
  const prompt = `Translate the following text to ${national}: \n ${text}`;
  const responseText = await callBedrockModel(prompt);
}

async function request(national: string, text: string) {
  const prompt = `Translate the following text to ${national}: \n ${text}`;
  const responseText = await callBedrockModel(prompt);
}
