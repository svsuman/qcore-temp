// config.js  
const environments = {  
    develop: {  
      baseUrl: 'https://dna.front.develop.squads-dev.com/',  
      // other settings for develop  
    },  
    staging: {  
      baseUrl: 'https://staging.example.com',  
      // other settings for staging  
    },  
    master: {  
      baseUrl: 'https://master.example.com',  
      // other settings for master  
    },  
    productionEU: {  
      baseUrl: 'https://eu.example.com',  
      // other settings for production EU  
    },  
    productionUS: {  
      baseUrl: 'https://us.example.com',  
      // other settings for production US  
    },  
  };  
    
  module.exports = environments;  
  