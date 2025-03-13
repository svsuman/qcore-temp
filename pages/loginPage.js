// pages/loginPage.js  
class LoginPage {  
    constructor(page) {  
        this.page = page;  
        this.usernameInput = page.locator('#loginName');  
        this.nextButton = page.locator('.Button---primary---1O3lq'); // Assuming the Next button has the same primary class  
        this.passwordInput = page.locator('#password');  
        this.loginButton = page.locator('button.Button---primary---1O3lq[type="submit"]');  
        this.bannerTitleSelector = '#myLearningRole';
        this.switchToLearnerLink=page.locator("[data-marker='switchToLearnerMenuButton']");
        this.myLearningStrip="[class*='MyLearningV2---rootDiv']";
    }  
  
    async enterUsername(username) {  
        await this.usernameInput.fill(username);  
        await this.nextButton.click();  
    }  
  
    async enterPassword(password) {  
        await this.passwordInput.fill(password);  
       
    }  
  
    async login(username, password) {  
        await this.enterUsername(username);  
        await this.enterPassword(password); 
       await this.loginButton.click(); 
    }  

    async switchToLearnerMode(){
        if(await this.page.$(this.switchToLearnerLink)!==null)
            await this.switchToLearnerLink.click(); 
            await this.page.$(this.myLearningStrip, { timeout: 60000 });
    }

     // Method to get the banner title locator  
    getBannerTitle() {
    return this.page.locator(this.bannerTitleSelector);
  }
}  
  
module.exports = { LoginPage };  
