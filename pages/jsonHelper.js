const fs = require('fs');
const jsonpath = require('jsonpath');

class JsonHelper {
    constructor() {
      }
    // Function to get the response and related searches for a given query string  
    async getResponseAndRelatedSearches(queryString) {  
        const data = fs.readFileSync('./test-data/file.json', 'utf8');
        const jsonObj = JSON.parse(data); 
        const item = jsonpath.query(jsonObj, `$[?(@.queryString=="${queryString}")]`)[0];
        if (item) {
            return {
                response: item.response,
                relatedSearches: item.relatedSearches
            };
        }

        return null;
    }

    
}

module.exports = { JsonHelper };  