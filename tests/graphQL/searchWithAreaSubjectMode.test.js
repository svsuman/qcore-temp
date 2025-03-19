require('dotenv').config({ path: `config/env.${process.env.NODE_ENV}.json` });
import fs from 'fs';
import path from 'path';
 
// Import the API testing library from Playwright  
import { test, expect } from "@playwright/test";
import { JSONPath } from "jsonpath-plus";
const { APIClient } = require('../../helpers/apiHelpers/APIClient.js');
 
let apiClientInstance;
let envVariables = null;
let licensePoolIds = null;
let queryPath, graphqlQuery;
 
 
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
  queryPath = path.join(__dirname, '..', '..', 'test-data', 'search.graphql');
  graphqlQuery = fs.readFileSync(queryPath, 'utf8');
});
 
 
test('Search with area uuid as query gives 200 resposne @graphQL', async () => {
 
  const variables = {
    "query": "22335ad0-dc1e-11e7-9fe8-1b7f5fcc733d",
    "source": "WEB_AREA_LANDING_PAGE",
    "areaType": "CAREER_JOURNEYS",
    "locale": "en-US",
    "ignoreCountryCode": true,
    "includeEnglish": false,
    "searchMode": "AREA_PAGE",
    "searchVersion": "V2",
    "pagination": {
      "page": 0,
      "perPage": 20
    },
  };
  const headers = {
    "x-sks-user-id": envVariables.AdminUserUuid,
    "x-sks-org-id": envVariables.organizationUuid
  };
 
  let res = await apiClientInstance.makePostRequestWithHeaders('/graphql', {
    query: graphqlQuery,
    variables: variables
  }, envVariables.services['content-search'], headers);
 
  // Assert that the response status is 200  
  const expectedTitles = [  
    "Building Customer Relationships in a Virtual Environment",  
    "Users First Mindset",  
    "Agile Methodologies",  
    "Data analytics",  
    "Design Thinking",  
    "Agile Leadership Awareness (Entry Level)",  
    "Designing Digital Experiences",  
    "Championing Digital Transformation",  
    "MIT Sloan Management Review Article on Why Manufacturers Need a Phased Approach to Digital Transformation"  
  ];  
  const responseBody = await res.json();
   // Get the titles from the response  
   const responseTitles = responseBody.data.search.results.map(result => result.title);  
  
   // Check that every expected title is included in the response titles  
   const allExpectedTitlesIncluded = expectedTitles.every(expectedTitle =>   
     responseTitles.some(responseTitle => responseTitle.includes(expectedTitle))  
   );    
   expect(allExpectedTitlesIncluded).toBe(true);  
 
});
 
test('Search with french area uuid as query gives 200 resposne @graphQLTest', async () => {
 
  const variables = {
    "query": "22335ad0-dc1e-11e7-9fe8-1b7f5fcc733d",
    "source": "WEB_AREA_LANDING_PAGE",
    "areaType": "CAREER_JOURNEYS",
    "locale": "fr-FR",
    "ignoreCountryCode": true,
    "includeEnglish": false,
    "searchMode": "AREA_PAGE",
    "searchVersion": "V2",
    "pagination": {
      "page": 0,
      "perPage": 20
    },
  };
  const headers = {
    "x-sks-user-id": envVariables.AdminUserUuid,
    "x-sks-org-id": envVariables.organizationUuid
  };
 
  let res = await apiClientInstance.makePostRequestWithHeaders('/graphql', {
    query: graphqlQuery,
    variables: variables
  }, envVariables.services['content-search'], headers);
 
  // Assert that the response status is 200  
  const expectedTitles = [  
    "Contribuer en tant que membre d'équipe virtuelle",  
    "Maintenir le contact et communiquer au sein de l'équipe",  
    "Design thinking",  
    "Apprentissage permanent",  
    "Big Data",  
    "Les indispensables du numérique",  
    "Méthodes agiles"
  ];  
  const responseBody = await res.json();
   // Get the titles from the response  
    responseBody.data.search.results.forEach((result, index) => {
    // Ensure that the title is not null or undefined  
    expect(result.title).not.toBeNull();
    console.log(result.title)
    expect(result.title).toBeDefined();
  });
  const responseTitles = responseBody.data.search.results.map(result => result.title);  
  
   // Check that every expected title is included in the response titles  
   const allExpectedTitlesIncluded = expectedTitles.every(expectedTitle =>   
     responseTitles.some(responseTitle => responseTitle.includes(expectedTitle))  
   );  
 
});
 