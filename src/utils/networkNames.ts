import { uploadToS3, getFileFromS3 } from "../s3service";

const BUCKET_NAME = 'blackout-15-globee';
const NETWORK_NAMES_KEY = 'network-names.json';

export async function getNetworkNames(): Promise<string[]> {
  try {
    const fileString = await getFileFromS3(BUCKET_NAME, NETWORK_NAMES_KEY);
    if (!fileString) {
      return [];
    }
    const arr = JSON.parse(fileString) as string[];
    return arr;
  } catch (err) {
    console.error('Error in getNetworkNames:', err);
    return [];
  }
}

export async function saveNetworkNames(names: string[]): Promise<void> {
  try {
    const fileString = JSON.stringify(names);
    const fileBuffer = Buffer.from(fileString, 'utf-8');
    await uploadToS3(fileBuffer, NETWORK_NAMES_KEY);
  } catch (err) {
    console.error('Error in saveNetworkNames:', err);
  }
}