'use strict';

/*
    CasparCG Developer Widget
    Originally Created By Christopher Ouellette
    Please feel free to suggest add ons, re-work the entire widget or, anything in between!
    Got a cool addition, please reach out!
*/

// Setup variables
const HTML_URL = 'http://localhost:8082/HTML/DEV/dev.html';
const STYLESHEET_URL = 'http://localhost:8082/STYLES/css/DEV/dev.css';

// Data that is used to setup the widget
let devData = {};

// Initializes the Development Widget
const initializeDevEnv = () => {
    // Fetch the html that makes up the Dev Widget
    return fetch(HTML_URL, {method: 'GET'})
    .then(res => res.text())
    .then(res => {
        // Parse the Text as HTML
        const parser = new DOMParser();
        const html = parser.parseFromString(res, "text/html");
        const devControls = html.querySelector('.dev-controller');
        const link = document.createElement('link');
        const body = document.querySelector('body');

        link.rel = 'stylesheet';
        link.href = STYLESHEET_URL;
        // Append and load the Style Sheet
        document.querySelector('head').append(link);
        // Append Dev Controls Widget
        body.append(devControls);

        // Try to get and parse Dev Data
        try {
            if(!localStorage.length) throw new Error();
            devData = JSON.parse(localStorage.getItem('devData'));
        } catch(e) {
            if(Object.keys(e).length) return console.log('Error finding Dev Data', e);
            return console.warn(`
Welcome to CasparCG HTML Developer Widget.
To begin, simply click a playout command, enter a custom command, or set a background color using a HEX, RGB, or RGBA value.
The position input can work with or without commas, a space is requred at minimum.`);
        }

        // If there is something in the devData object.
        if(Object.keys(devData).length) {
            if(devData.backgroundColor !== undefined) {
                setBackgroundColor(devData.backgroundColor);
            } 
            if(devData.hideControls !== undefined && devData.hideControls) {
                hideControls();
            } else if(devData.shrinkControls !== undefined && devData.shrinkControls) {
                shrinkControls();
            }
            if(devData.removeBackground !== undefined) removeBackground(devData.removeBackground); 
            if(devData.customCommand) {
                document.querySelector('#dev-custom-commands').value = devData.customCommand;
            }
            if(devData.position) {
                moveWidget(devData.position);
                // Sets the value of the select elements that position the widget
                document.querySelector('.dev-controller .position').value = devData.position.reduce((acc, item, i) => {
                    acc += item.substring(0, 1).toUpperCase() + item.substring(1) + ', ';
                    if(i === devData.position.length - 1) acc = acc.slice(0, -2)
                    return acc;
                }, '');
            }
        } else {
            console.log('No Dev Data', devData)
        }
    });
}

// Sets the Background color of the body HTML Element
// @param {object} e - Event oject
const setBackgroundColor = e => {
    const rawValue = e.target ? e.target.value : e;
    const val = adjustColorDev(rawValue, {});
    if(!val) throw new Error('Adjusting the Color requires a valid HEX, RGB, or RGBA value. Example: HEX: #FFF or #FFFFFF RGB: 255, 255, 255 RGBA 255, 255, 255, .5');
    if(val.includes('/')) {
        document.querySelector('body').style.backgroundImage = `url(${val})`;
        return saveDevData({backgroundColor: `url(${val})`});
    }
    try {
        // Get the inverted color of the set background color
        const invert = adjustColorDev(val, {invert: true});
        const buttons = document.querySelectorAll('.dev-controller button:not(.control)'),
            inputs = document.querySelectorAll('.dev-controller input'),
            input = document.querySelector('.dev-controller #dev-bkg-color');
        
        document.querySelector('body').style.backgroundColor = val;
        document.querySelector('body').style.backgroundImage = null;
        document.querySelector('.dev-controller').style.backgroundColor = invert;
        buttons.forEach(elem => {
            elem.style.color = val;
        });
        inputs.forEach((elem) => elem.style.border = `1px solid ${val}`);
        input.value = rawValue;
        return saveDevData({backgroundColor: rawValue});
    } catch(e) {
        console.error(e);
    }
}

// Saves the text entered into the custom command input
const setCustomCommand = e => {
    return saveDevData({customCommand: e.target.value});
}

// Attemps to run a function on the global scope, typically a custom command
const runCustomCommand = () => {
    if(!devData.customCommand) return;
    if(typeof window[devData.customCommand] === 'function') return window[devData.customCommand]();
    return console.error(`Unable to execute ${devData.customCommand}`);
}

// Moves the widget to one of the corners or a custom position.info-con
// @param {object} e - Event Obeject
const moveWidget = (e) => {
    const container = document.querySelector('.dev-controller');
    let value = e.target ? e.target.value : e;
    if(typeof value === 'string') {
        value = value.includes(',') 
            ? value.split(',').map(i => i.trim().toLowerCase())
            : value.split(' ').map(i => i.trim().toLowerCase());
    }
    
    if(value.includes('top')) {
        container.style.top = '0px';
        container.style.bottom = 'auto';
    } else if(value.includes('bottom')) {
        container.style.top = 'auto';
        container.style.bottom = '0px';
    }
    if(value.includes('right')) {
        container.style.right = '0px';
        container.style.left = 'auto';
    } else if(value.includes('left')) {
        container.style.right = 'auto';
        container.style.left = '0px';
    }
    return saveDevData({position: value});
}

// Shows the widget
const showController = () => {
    const controls = document.querySelector('.dev-controller');
    const val = document.querySelector('.dev-controller #dev-bkg-color').value;
    controls.classList = 'dev-controller open';
    // If we are not hiding the background
    if(!devData.removeBackground) {
        const invert = adjustColorDev(val, {invert: true});
        const hide = document.querySelector('.dev-controller .hide'),
            shrink = document.querySelector('.dev-controller .shrink'),
            invis = document.querySelector('.dev-controller .invis');
        hide.style.color = val;
        shrink.style.color = val;
        invis.style.color = val;
        controls.style.backgroundColor = invert;
    }
}

// Hides the widget
const hideControls = () => {
    const controls = document.querySelector('.dev-controller');
    if(controls.classList.contains('hide')) {
        showController();
        return saveDevData({hideControls: false});
    } else {
        const val = document.querySelector('.dev-controller #dev-bkg-color').value;
        document.querySelector('.dev-controller .hide').style.color = 
            adjustColorDev(val, {invert: true});
        controls.style.backgroundColor = 'transparent';
        controls.classList = 'dev-controller hide';
        return saveDevData({hideControls: true, shrinkControls: false});
    }
}

// Shrinks the widget
const shrinkControls = () => {
    const controls = document.querySelector('.dev-controller');
    if(controls.classList.contains('shrink')) {
        showController();
        return saveDevData({shrinkControls: false});
    } else {
        const val = document.querySelector('.dev-controller #dev-bkg-color').value;
        const invert = adjustColorDev(val, {invert: true});
        const hide = document.querySelector('.dev-controller .hide'),
            shrink = document.querySelector('.dev-controller .shrink'),
            invis = document.querySelector('.dev-controller .invis');
        hide.style.color = invert;
        shrink.style.color = invert;
        invis.style.color = invert;
        controls.style.backgroundColor = 'transparent';
        controls.classList = 'dev-controller shrink';
        return saveDevData({hideControls: false, shrinkControls: true});
    }
}

// Removes the widgets background
const removeBackground = e => {
    const controls = document.querySelector('.dev-controller');
    const val = document.querySelector('.dev-controller #dev-bkg-color').value;
    const hide = document.querySelector('.dev-controller .hide'),
        shrink = document.querySelector('.dev-controller .shrink'),
        invis = document.querySelector('.dev-controller .invis'),
        buttons = document.querySelectorAll('.controls button');
    if(buttons[0].classList.contains('transparent')) {
        buttons.forEach(b => {
            b.classList.remove('transparent');
            b.style.color = 'white';
        });
        if(controls.classList.contains('open')) {
            hide.style.color = val;
            shrink.style.color = val;
            invis.style.color = val;
            controls.style.backgroundColor = val 
                ? adjustColorDev(val, {invert: true}) : 'grey';
        }
        return saveDevData({removeBackground: false});
    } else if(e !== false) {
        const invert = val ? adjustColorDev(val, {invert: true}) : '#000';
        hide.style.color = invert;
        shrink.style.color = invert;
        invis.style.color = invert;
        buttons.forEach(b => {
            b.classList.add('transparent');
            b.style.color = invert;
        });
        controls.style.backgroundColor = 'transparent';
        return saveDevData({removeBackground: true});
    }
}

// Compares two objects and returns a new update object
// @param {object} obj1 - The new object
// @param {obejct} obj2 - The old object to be updated
// @returns {object} The updated object
const compareObjects = (obj1, obj2) => {
    if(!obj1 || !obj2 | !Object.keys(obj1).length) return false;
    // Loop through each item in the new object
    return Object.keys(obj1).reduce((acc, key) => {
        // If the item is a string
        if(typeof obj1[key] !== 'object' && !Array.isArray(obj1[key])) {
            // If the item is not null and does not equal the old object
            if(obj1[key] !== null && obj1[key] !== obj2[key]) {
                acc[key] = obj1[key];
            // If it is null, remove it
            } else if(obj1[key] === null) {
                delete acc[key];
            }
        // If the item is an array
        } else if(Array.isArray(obj1[key])) {
            acc[key] = obj1[key];
        // If the item is an object
        } else if(typeof obj1[key] === 'object') {
            // Create or get the sub object to be compared to
            const hasSubObject = obj2[key] ? obj2[key] : {};
            // Compare the sub objects
            acc[key] = compareObjects(obj1[key], hasSubObject);
        }
        return acc;
    // Start with the old object
    }, obj2);
}

// Compares the update sent and current data and saves it to local storage
const saveDevData = (update) => {
    devData = compareObjects(update, devData);
    localStorage.setItem('devData', JSON.stringify(devData));
}

// Adjusts colors based on a variabty of options
// @param {string} color - The color to be adjusted
// @param {object} A deconstructed option that provides options for adusting color
// @returns {string} The rgba or hex value requested to be adjusted
const adjustColorDev = (color, {opacity, invert, type}) => {
    // Color is a HEX value
    if(color[0] === '#') {
        color = color.slice(1);
        if(color.length === 3) {
            color = [color[0] + color[0], color[1] + color[1], color[2] + color[2]];
        } else if(color.length === 6) {
            color = [color[0] + color[1], color[2] + color[3], color[4] + color[5]];
        } else {
            console.error('A HEX value requires atleast 3 characters. Example: #fff or #ffffff');
            return false;
        }
        color = color.map(c => {return parseInt(c, 16)});
        color.push(1);
    // Color is an RGB value
    } else if(color.includes('rgb')) {
        color = color.includes('rgba') ? color.slice(4) : color.slice(3);
        color = color.replace(/[\(\)]/g, '');
        color = color.split(',');
        if(color.length < 3) {
            console.error('An RGB value requires atleast 3 value. Example: 255, 255, 255');
            return false;
        }
        if(color.length === 3) color.push(1);
    } else if(color.includes(',')) {
        color = color.split(',').map(c => c.trim());
        if(color.length < 3) {
            console.error('An RGB value requires atleast 3 value. Example: 255, 255, 255');
            return false;
        }
        if(color.length === 3) color.push(1);
    } else {
        console.error('Adjusting the Color requires a valid HEX, RGB, or RGBA value', 
            'Example: HEX: #FFF or #FFFFFF RGB: 255, 255, 255 RGBA 255, 255, 255, .5');
        return false;
    }
    // Convert all strings to numbers
    color = color.map(c => typeof c === 'string' ? Number(c) : c);
    // Check and set opacity
    if(!isNaN(opacity) && Math.sign(opacity) && opacity <= 1) color[3] = Number(opacity);
    // Check and check invert
    if(invert) color = color.reduce((acc, c, i) => {
        i === 3 ? acc.push(c) : acc.push(255-c);
        return acc;
    }, []);
    // Check if a HEX type was requested back, if not return RGBA
    if(typeof type === 'string' && type.toLowerCase() === 'hex') {
        return `#${((1 << 24) + (color[0] << 16) + (color[1] << 8) + color[2]).toString(16).slice(1)}`;
    } else {
        return `rgba(${color[0]},${color[1]},${color[2]},${color[3]})`;
    }
}

// Loads the Dev Widget
initializeDevEnv();