require('dotenv').config({ path: `config/env.${process.env.NODE_ENV}.json` });

// Import the API testing library from Playwright  
import { test, expect } from "@playwright/test";
import { JSONPath } from "jsonpath-plus";
const { APIClient } = require('../../helpers/apiHelpers/APIClient.js'); 

let apiClientInstance;
let envVariables = null;
let licensePoolIds=null;


test.beforeAll(async () => {  
  envVariables = APIClient.getEnvVariables();  
  const orgV2ServiceConfig = envVariables.services['organizations-api'];  
  // Initialize the API client instance without specific service details  
  apiClientInstance = new APIClient();    
  const endpoint = `/api/organizations/${envVariables.organizationUuid}/users/${envVariables.AdminUserUuid}/license-ids`;  
  console.log(orgV2ServiceConfig);
  // Make the GET request to the organizations-api to fetch licensePoolIds  
  const res = await apiClientInstance.makeGetRequest(endpoint, {}, orgV2ServiceConfig);  
  if (res.ok()) {  
    const responseJson = await res.json();  
    licensePoolIds = responseJson.licensePoolsIds; // Array of strings (UUIDs)   
    console.log(licensePoolIds);
  } else {    
    console.error('Failed to fetch license pools. Status:', res.status(), 'Response:', await res.text());  
    throw new Error('Failed to fetch license pools');  
  }  
}); 


test('Basic Search Query returns relevant results and status code 200 @HealthCheck @Regression @Smoke', async () => {
  // Define the search query  
  const searchQuery = 'software';
  // Make a GET request to the search endpoint with the query parameter  
  let res = await apiClientInstance.makeGetRequest('v1/search', {
    params: {
      q: searchQuery, // the search query  
      locale: 'en-US', // assuming 'en' is a supported locale  
      ignoreCountryCode: true,
      licensePoolUuids: licensePoolIds,
      includeEnglish: false,
      userUuid: envVariables.AdminUserUuid,
      organizationUuid: envVariables.organizationUuid,
      includeContentNotInChannel: false,
      fromTypeahead: false,
      fromRelatedSearch: false,
      getSearchQuery: false
    },
  }, envVariables.services['content-search']);

  const responseBody = await res.json();
  console.log(responseBody);
  expect(responseBody.results).toBeDefined();
  expect(responseBody.results[0].title).not.toBeNull();
  expect(responseBody.results.length).toBeLessThanOrEqual(10);

  responseBody.results.forEach((result, index) => {
    // Ensure that the title is not null or undefined  
    expect(result.title).not.toBeNull();
    expect(result.title).toBeDefined();
  });
});

test('Basic Search Query with Filter as Book ,Video @Smoke', async ({ request }) => {
  // Define the search query  
  const searchQuery = 'software development';
  const filters = {
    typeFilter: ['VIDEO', 'BOOK'],
    contentTypeFilter: ['COURSE', 'VIDEO'],
  };

  // Make a GET request to the search endpoint with the query parameter  
  let res = await apiClientInstance.makeGetRequest('v1/search', {
    params: {
      q: searchQuery, // the search query 
      ...Object.fromEntries(Object.entries(filters).map(([key, value]) => [key, Array.isArray(value) ? value.join(',') : value])),
      locale: 'en-US', // assuming 'en' is a supported locale  
      ignoreCountryCode: false,
      licensePoolUuids: licensePoolIds,
      includeEnglish: false,
      userUuid: envVariables.AdminUserUuid,
      organizationUuid: envVariables.organizationUuid,
      includeContentNotInChannel: false,
      fromTypeahead: false,
      fromRelatedSearch: false,
      getSearchQuery: false
    },
  }, envVariables.services['content-search']);

  // Assert that the response status is 200  
  expect([200, 206]).toContain(res.status());

  let responseBody = await res.json();
  expect(responseBody.results).toBeDefined();
  expect(responseBody.results[0].title).not.toBeNull();
  expect(responseBody.results.length).toBeLessThanOrEqual(10);

  responseBody.results.forEach((result, index) => {
    // Ensure that the title is not null or undefined  
    expect(result.title).not.toBeNull();
    expect(result.title).toBeDefined();
  });

  const filtersResponse = JSONPath({ path: '$.results[*].category', json: responseBody });
  expect(Array.isArray(filtersResponse)).toBe(true);

  // Check each item in the filtersResponse array  
  filtersResponse.forEach(category => {
    // Expect the category to be either 'Book' or 'Video'  
    expect(['Book', 'Video']).toContain(category);
  });
});

  
test('Search with Invalid Query returns 400 Bad Request or relevant error message @Regression', async ({ request }) => {  
  // Define the invalid search query with special characters  
  const invalidSearchQuery = '@@@###$$$%%%^^^&&&***';  
  
  // Make a GET request to the search endpoint with the invalid query  
  let res = await apiClientInstance.makeGetRequest('v1/search', {
    params: {
      q: invalidSearchQuery, // the search query 
      locale: 'en-US', // assuming 'en' is a supported locale  
      ignoreCountryCode: false,
      licensePoolUuids: licensePoolIds,
      includeEnglish: false,
      userUuid: envVariables.AdminUserUuid,
      organizationUuid: envVariables.organizationUuid,
      includeContentNotInChannel: false,
      fromTypeahead: false,
      fromRelatedSearch: false,
      getSearchQuery: false
    },
  }, envVariables.services['content-search']);

  // Assert that the response status is 200  
  expect([200, 206]).toContain(res.status());
  
  const responseBody = await res.json();  
  expect(responseBody.results).toHaveLength(0); 
});