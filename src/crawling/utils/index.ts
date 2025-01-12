import { Browser, Page } from 'playwright';

export const getDocumentTextOfUrl = async (url: string, page: Page) => {
  console.log(url);
  const textContent = await page.evaluate(() => document.body.innerText);
  return { url, textContent };
};

export const getNextPageLinkByClickButton = async (
  page: Page,
  browser: Browser,
) => {
  // console.log('button search');
  const fallbackUrl = page.url();
  const allButtons = await page.$$('button');
  try {
    if (allButtons.length !== 0) {
      await allButtons[
        Math.min(Math.floor(Math.random() * 10), allButtons.length - 1)
      ].click();
      await page.waitForLoadState('load');
      return page.url();
    }
  } catch (e) {
    return fallbackUrl;
  }

  return;
};

export const getNextPageLinkByClickA = async (page: Page, browser: Browser) => {
  // console.log('a search');
  const fallbackUrl = page.url();
  const allA = await page.$$('a');
  if (allA.length !== 0) {
    try {
      const target =
        allA[Math.min(Math.floor(Math.random() * 10), allA.length - 1)];
      const targetHref = await target.evaluate((target) => target.href);

      if (targetHref === fallbackUrl) return;
      const url = targetHref;
      return url;
    } catch (e) {
      return;
    }
  }
  return;
};
