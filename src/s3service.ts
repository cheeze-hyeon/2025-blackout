// Import AWS SDK S3 client and utilities
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import s3 from 'aws-sdk/clients/s3';
import express, { Request, Response } from 'express';
import { Readable } from 'stream';

// AWS Configuration
const region = 'us-east-1'; // Update to your region

// IAM role provider for EC2 instance
const s3Client = new S3Client({ region });

// 파일 업로드 함수
async function uploadToS3(fileBuffer: Buffer, fileName: string) {
  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: 'blackout-15-globee',
        Key: fileName,
        Body: fileBuffer,
      }),
    );

    console.log('S3 업로드 완료:', fileName);

    return `https://blackout-15-globee.s3.us-east-1.amazonaws.com/${fileName}`;
  } catch (error) {
    console.error('S3 업로드 에러:', error);
    throw error;
  }
}

async function getFileFromS3(bucket: string, key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await s3Client.send(command);
  const str = await response.Body?.transformToString();
  return str || '';
}

const storeUserInfo = async (userId: string, userInfo: any) => {
  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: 'blackout-15-globee', // 실제 버킷 이름으로 변경하세요
        Key: `users/${userId}.json`,
        Body: JSON.stringify(userInfo),
        ContentType: 'application/json',
      }),
    );
    console.log(`사용자 정보 저장 완료: ${userId}`);
  } catch (error) {
    console.error('S3 저장 에러:', error);
    throw error;
  }
};

export { uploadToS3, getFileFromS3, storeUserInfo };
function streamToString(arg0: any) {
  throw new Error('Function not implemented.');
}
