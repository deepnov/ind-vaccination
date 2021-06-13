// Free API key for your Slack API call
const slackAPIKey = "xoxb-xx-yy-zz";//(NEED CONFIGURATION)
// set district id below for respective indian location Eg: chennai's district_id=571; hyderabad's district_id=581. We can get this information from Cowin portal district dropdown
const location = [{ districtId: 571, name: 'chennai' }, { districtId: 581, name: 'hyderabad' }];
// ID of your Slack channel if you want to send the message to your slack mobile app
const channelId = "vaccination-chennai";//(NEED CONFIGURATION)
//search patterns for finding availability from api response
let regexp = [{ re: /available_capacity\":[0-9]+,\"min_age_limit\":[0-9]+,\"vaccine\":\"COVAXIN/gi, type: 'covaxin',count:0 },
    { re: /available_capacity\":[0-9]+,\"min_age_limit\":[0-9]+,\"vaccine\":\"COVISHIELD/gi, type: 'covishield', count: 0},
    { re: /available_capacity\":[0-9]+,\"min_age_limit\":[0-9]+,\"vaccine\":\"SPUTNIK/gi, type: 'sputnik', count: 0}];

const currentTrackIndex = 2;//index of vaccine in regexp array for which alert needs to be sent (NEED CONFIGURATION)

const { WebClient, LogLevel } = require("@slack/web-api");
const puppeteer = require('puppeteer');//puppeteer mimics a chrome browser with no GUI. Note that Cowin API has CloudFront firewall(WAF) to block unnecessary api calls

function getData(whichDate) {
    var result = "Available vaccine slots for next 7 days: ";
    
    try {
        (async () => {
            const browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                ]
            });
            const page = await browser.newPage();
            
            //(NEED CONFIGURATION based on your desired location)
            const response = await page.goto("https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=" + location[0].districtId+"&date=" + whichDate, { waitUntil: 'networkidle0' });
            const body = await page.content();
            var apidata = body;

            for (var i = 0; i < regexp.length; i++) {
                const matches = apidata.matchAll(regexp[i].re);
                let matchArray = Array.from(matches);
                console.log(regexp[i].type + ":" + matchArray.length + " centres");

                for (var j = 0; j < matchArray.length;j++) {
                    const matches1 = matchArray[j][0].match(/(\d+)/);
                    
                    if (matches1) {
                        let myString = parseInt(matches1[0]);
                        if (myString > 0) {
                            //sum the available slots for each centre for a specific vaccine
                            regexp[i].count = regexp[i].count + myString;

                        }
                    }
                }
            }
            

            let feed_result = "[API code:"+response.status()+"]";
            for (var i = 0; i < regexp.length; i++) {
                feed_result+= "(" + regexp[i].type + "=" + regexp[i].count + ")";                
            }
            console.log(feed_result);
            try {
                if (regexp[currentTrackIndex].count > 0) {
                    
                    console.log(regexp[currentTrackIndex].type+" is available!");
                    // WebClient insantiates a client that can call API methods
                    const client = new WebClient(slackAPIKey, {
                        // LogLevel can be imported and used to make debugging simpler
                        logLevel: LogLevel.DEBUG
                    });

                    const ret = client.chat.postMessage({
                        channel: channelId,
                        text: result+feed_result + ". Please register for a slot in cowin portal immediately [" + location[0].name+"].", //(NEED CONFIGURATION based on your desired location)
                        as_user: "xxxxx" // Your slackbot's user id (NEED CONFIGURATION)
                    });
                    result = feed_result;
                    console.log(ret);
                }
            }
            catch (error) { console.log("Error in slack messaging:"+error); console.error(error); }
           
            await browser.close();
        })();
                          
    }
    catch (error) {
        console.error("Error in vaccine feed API connection and data retrieval:" +error);
        result = error;
    }
    return result;
}

function main(){
    try {
        
        let d = new Date();
        let mm = d.getMonth()+1;
        let yyyy = d.getFullYear();
        let dd = d.getDate();
        let today=dd+"-"+mm+"-"+yyyy;
        const msg = getData(today);
        console.log(msg);
        
    }
    catch (error) {
        console.error("Error in main():" +error);
    }
}

main();
