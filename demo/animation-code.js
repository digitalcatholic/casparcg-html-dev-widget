'use strict';

const ENV = 'DEV';

// Change DEV_SCRIPT_URL to the url the dev.js script will be served from 
const DEV_SCRIPT_URL = 'http://localhost:3000/dev.js';

window.onload = () => {
    if(ENV && ENV === 'DEV') {
        const script = document.createElement('script');
        script.type = "application/javascript";
        script.src = DEV_SCRIPT_URL;
        document.querySelector('body').append(script);
    }
};