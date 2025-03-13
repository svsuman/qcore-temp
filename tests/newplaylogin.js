const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/loginPage');
const { SearchPage } = require('../pages/searchPage');
const environments = require('../config');

const environment = process.env.TEST_ENV || 'develop'; // Default to 'develop' if not set    
const config = environments[environment];

test.describe('Login functionality', () => {
  test('should log in with valid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    // Navigate to the login page using the base URL from the environment config    
    await page.goto(`${config.baseUrl}`);
    // Use the login method from the LoginPage object    
    await loginPage.login('adminsw', '##knock22');
    // Create a new instance of SearchPage  
    const searchPage = new SearchPage(page);
    // Use the SearchPage methods from the instance  
    await searchPage.typeInSearch('java');    
   // await searchPage.waitForPageLoad();
    await expect(await searchPage.locateFilterBySpan()).toBeVisible();
    
    await searchPage.waitForAISearchToLoad();
    await searchPage.getTheAIResponse();

    await searchPage.getListOfAllTypeFilters();
    expect(await searchPage.compareUIAndCacheResponse('java')).toBeTruthy;
    expect(await searchPage.compareUIAndCacheRelatedSearches('java')).toBeTruthy;

    await searchPage.clearSearchInput();

    await searchPage.typeInSearch('python');
    await expect(await searchPage.locateFilterBySpan()).toBeVisible();

    await searchPage.waitForAISearchToLoad();
    await searchPage.getTheAIResponse();

    expect(await searchPage.compareUIAndCacheResponse('python')).toBeTruthy;
    expect(await searchPage.compareUIAndCacheRelatedSearches('python')).toBeTruthy;

    await searchPage.clearSearchInput();

    await searchPage.typeInSearch('assistant');
    await searchPage.waitForAISearchToLoad();
    await searchPage.getTheAIResponse();

    expect(await searchPage.compareUIAndCacheResponse('assistant')).toBeTruthy;
    expect(await searchPage.compareUIAndCacheRelatedSearches('assistant')).toBeTruthy;
  });

});  