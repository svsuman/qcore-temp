const { JsonHelper } = require('../pages/jsonHelper');
class SearchPage {
  // The constructor takes a Playwright page object  
  constructor(page) {
    this.page = page;
    this.searchInputSelector = '//input[@id="search_box"]';
    this.filterByTextSelector = 'h3 span';
    
    this.searchIcon = '[data-marker="contentSearchBtn"]';
    this.typeFilterLabelList = "#typeFilter span[class*='LabelWithCount---wrapLabel---']";
    this.aiSearchResponse = "[data-marker='searchAiResponseHeader']";
    this.aiSearchResponseText = "[class*='SearchV2---definitionTxt---']";
    this.aiSearchResponse = "[data-marker='searchAiResponseHeader']";
    this.aiSearchNote = "[class*='SearchV2---noteSec---']";
    this.relatedSearchesLink="[class*='SearchV2---keywordLink']";
  }

 

  async typeInSearch(text) {
    await this.page.waitForTimeout(3000); 
    await this.page.waitForSelector(this.searchInputSelector); // Ensure the search input is ready  
    await this.page.fill(this.searchInputSelector, text);
    await this.page.click(this.searchIcon);
    await this.page.waitForTimeout(2000);
  }
  // Method to get the value of the search input  
  async getSearchInputValue() {
    return this.page.inputValue(this.searchInputSelector);
  }

  // Method to clear the search input  
  async clearSearchInput() {
    await this.page.fill(this.searchInputSelector, '');
  }

  async locateFilterBySpan() {
    
    await  this.page.waitForTimeout(3000);
    return this.page.getByText('Filter by');

  }

  async getListOfAllTypeFilters() {
    const elements = await this.page.$$(this.typeFilterLabelList);
    const texts = await Promise.all(elements.map(element => element.innerText()));
    return texts;
  }

  async waitForAISearchToLoad() {
    await this.page.waitForSelector(this.aiSearchResponse);
  }

  async getTheAIResponse() {

    console.log(await this.page.locator(this.aiSearchNote).textContent());
  }

  async compareUIAndCacheResponse(queryString) {
    const jsonhelper = new JsonHelper();  
    const result = await jsonhelper.getResponseAndRelatedSearches(queryString);
    console.log(result.response);
    const pageText = await this.page.locator(this.aiSearchResponseText).textContent();
    console.log(pageText);
    if (result.response===pageText) {
      console.log('The text on the page matches the response.');
      return true;
    }

  }
  async arraysAreEqual(array1, array2)  {  
    if (array1.length !== array2.length) {  
        return false;  
    }  
    array1.sort();  
    array2.sort();  
    // Check if all elements in the sorted arrays are equal  
    return array1.every((value, index) => value === array2[index]);  
}  

  async compareUIAndCacheRelatedSearches(queryString) {
    const jsonhelper = new JsonHelper();  
    const result = await jsonhelper.getResponseAndRelatedSearches(queryString);
    await this.page.waitForSelector(this.relatedSearchesLink) 
    const elements = await this.page.$$(this.relatedSearchesLink, { timeout: 90000 });
    const texts = await Promise.all(elements.map(element => element.innerText()));
    if (await this.arraysAreEqual(result.relatedSearches,texts)) {
      console.log('The related searches on the page matches the response.');
      return true;
    }
  }
}

module.exports = { SearchPage };  
