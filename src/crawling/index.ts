import { chromium } from 'playwright';
import {
  getDocumentTextOfUrl,
  getNextPageLinkByClickA,
  getNextPageLinkByClickButton,
} from './utils';

import { requestLinkInfo } from '../AImodel';

export const getNextUrlToBegin = async (entryUrl: string) => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(10000);
  await page.goto(entryUrl);
  // await page.waitForEvent('load');
  const { textContent: entryTextContent } = await getDocumentTextOfUrl(
    entryUrl,
    page,
  );
  console.log('get entry url');

  const nextLinkByA = await getNextPageLinkByClickA(page, browser);
  if (nextLinkByA) {
    await page.goto(nextLinkByA);
    const { url, textContent } = await getDocumentTextOfUrl(nextLinkByA, page);
    await browser.close();
    console.log('get a', url, entryUrl);
    const result = [
      { link: url, text: textContent },
      { link: entryUrl, text: entryTextContent },
    ];

    return result;
  }
  const nextLinkByButton = await getNextPageLinkByClickButton(page, browser);
  if (nextLinkByButton) {
    await page.goto(nextLinkByButton);
    const { url, textContent } = await getDocumentTextOfUrl(
      nextLinkByButton,
      page,
    );
    console.log('get button', url, entryUrl);
    await browser.close();
    console.log(url, entryUrl);
    const result = [
      { link: url, text: textContent },
      { link: entryUrl, text: entryTextContent },
    ];
    return result;
  }
  await browser.close();
  return;
};

const crawlSite = async (url: string, recursive: boolean = true) => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(url);

  await page.waitForEvent('load');

  const pageContent = await page.evaluate(() => {
    return document.body.innerText;
  });

  console.log(pageContent);

  await browser.close();
};

// 시작 URL을 입력
// crawlSite('https://www.snu.ac.kr/');
export const useUpdateCrawlingLink = async (
  keyword: string,
  entryUrl: string,
) => {
  const nextAndPrevUrlData = await getNextUrlToBegin(entryUrl);
  if (!nextAndPrevUrlData) {
    return entryUrl;
  }
  const result = await requestLinkInfo(keyword, nextAndPrevUrlData);

  return result;
};
