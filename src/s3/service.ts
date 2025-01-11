import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';

// EC2에 IAM 역할이 설정되어 있으므로 credentials 불필요
const s3Client = new S3Client({
  region: 'us-east-1',
});

// 파일 업로드 함수
async function uploadToS3(fileBuffer: Buffer, fileName: string) {
  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: 'blackout-15-bucket', // 여기에 실제 버킷 이름을 넣으세요
        Key: fileName,
        Body: fileBuffer,
      }),
    );

    console.log('S3 업로드 완료:', fileName);

    return `https://blackout-15-bucket.s3.ap-northeast-2.amazonaws.com/${fileName}`;
  } catch (error) {
    console.error('S3 업로드 에러:', error);
    throw error;
  }
}

// 파일 다운로드 함수
async function getFromS3(fileName: string) {
  try {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: 'blackout-15-bucket', // 여기에 실제 버킷 이름을 넣으세요
        Key: fileName,
      }),
    );
    console.log('S3 다운로드 완료:', fileName);
    return response.Body;
  } catch (error) {
    console.error('S3 다운로드 에러:', error);
    throw error;
  }
}

const storeUserInfo = async (userId: string, userInfo: any) => {
  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: 'your-bucket-name', // 실제 버킷 이름으로 변경하세요
        Key: `users/${userId}.json`,
        Body: JSON.stringify(userInfo),
        ContentType: 'application/json',
      }),
    );
  } catch (error) {
    console.error('S3 저장 에러:', error);
    throw error;
  }
};

export { uploadToS3, getFromS3, storeUserInfo };
