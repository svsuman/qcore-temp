const { request } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

class APIClient {

  async makeGetRequest(endpoint, queryParams , serviceConfig) {  
    // Create the Basic Auth header if username and password are provided  
    let authHeader = '';  
    if (serviceConfig.basicUser && serviceConfig.basicPassword) {  
      authHeader = `Basic ${Buffer.from(`${serviceConfig.basicUser}:${serviceConfig.basicPassword}`).toString('base64')}`;  
    } else if (serviceConfig.token) {  
      // If a token is provided, use it directly  
      authHeader = `Basic ${serviceConfig.token}`;  
    }  
  
    const req = await request.newContext({  
      extraHTTPHeaders: {  
        'Authorization': authHeader,  
        'Content-Type': 'application/json',  
      },  
    });  
    const url = new URL(endpoint,serviceConfig.url);   
    if (queryParams.params) {
      for (const [key, value] of Object.entries(queryParams.params)) {
        url.searchParams.append(key, value);
      }
    }
    
    const response = await req.get(url.href, {  
      data: JSON.stringify(queryParams),  
    });  
    
    return response;  
  }  

  async makePostRequest(endpoint, queryParams = {},serviceConfig) {  
    let authHeader = '';  
    console.log(queryParams);
    if (serviceConfig.basicUser && serviceConfig.basicPassword) {  
      authHeader = `Basic ${Buffer.from(`${serviceConfig.basicUser}:${serviceConfig.basicPassword}`).toString('base64')}`;  
    } else if (serviceConfig.token) {  
      // If a token is provided, use it directly  
      authHeader = `Basic ${serviceConfig.token}`;  
    }  
    // Create a new request context for each request with the Authorization header  
    const req = await request.newContext({  
      extraHTTPHeaders: {  
        'Authorization': authHeader,  
        'Content-Type': 'application/json', 
      },  
    });  
    const url = new URL(endpoint, serviceConfig.url);  
    if (queryParams.params) {
      for (const [key, value] of Object.entries(queryParams.params)) {
        url.searchParams.append(key, value);
      }
    }
    console.log(`Sending POST request to: ${url.href}`);  
    console.log('With payload:', queryParams);  
  
    // Perform the POST request using the req context created above  
    const response = await req.post(url.href, {  
      data: JSON.stringify(queryParams),  
    });  
    return response;  
  }
  
  async makePostRequestWithHeaders(endpoint, queryParams = {},serviceConfig,extraHeaders={}) {  
    let authHeader = '';  
    
   
    if (serviceConfig.basicUser && serviceConfig.basicPassword) {  
      authHeader = `Basic ${Buffer.from(`${serviceConfig.basicUser}:${serviceConfig.basicPassword}`).toString('base64')}`;  
    } else if (serviceConfig.token) {  
      // If a token is provided, use it directly  
      authHeader = `Basic ${serviceConfig.token}`;  
    }  
  
    //Basic headers
     let  allHeaders = {  
      'Authorization': authHeader,  
      'Content-Type': 'application/json',
     };

     //Merging extraHeaders to allHeaders 
     if(Object.keys(extraHeaders).length>0){
      allHeaders = {...allHeaders,...extraHeaders};
     }
    //console.log('final::'+JSON.stringify(allHeaders));
    //Adding required headers to request object
    const req = await request.newContext({  
      extraHTTPHeaders: allHeaders
    });  

    const url = new URL(endpoint, serviceConfig.url);  
    if (queryParams.params) {
      for (const [key, value] of Object.entries(queryParams.params)) {
        url.searchParams.append(key, value);
      }
    }
    console.log(`Sending POST request to: ${url.href}`);  
    console.log('With payload:', queryParams);  
  
    // Perform the POST request using the req context created above  
    const response = await req.post(url.href, {  
      data: JSON.stringify(queryParams),  
    });  
    return response;  
  }

  async makePutRequest(endpoint, queryParams = {}, requestBody = {}, serviceConfig) {  
    let authHeader = '';  
    if (serviceConfig.basicUser && serviceConfig.basicPassword) {  
      authHeader = `Basic ${Buffer.from(`${serviceConfig.basicUser}:${serviceConfig.basicPassword}`).toString('base64')}`;  
    } else if (serviceConfig.token) {  
      authHeader = `Basic ${serviceConfig.token}`;  
    }  
    const req = await request.newContext({  
      extraHTTPHeaders: {  
        'Authorization': authHeader,  
        'Content-Type': 'application/json',  
      },  
    });  
    const url = new URL(endpoint, serviceConfig.url);  
    if (queryParams.params) {  
      for (const [key, value] of Object.entries(queryParams.params)) {
        url.searchParams.append(key, value);  
      }  
    }  
    // console.log(`Sending PUT request to: ${url.href}`);  
    // console.log('With payload:', queryParams); 
    const response = await req.put(url.href, {  
      data: JSON.stringify(requestBody), 
    });  
    return response;  
  }
  

  static getEnvVariables() {
    const configPath = path.join(__dirname, '../../config', `${process.env.NODE_ENV}.json`);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config;
  }
  
}



module.exports = { APIClient };  