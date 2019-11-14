'use strict';

/*
    CasparCG Developer Widget
    Originally Created By Christopher Ouellette
    Please feel free to suggest add ons, re-work the entire widget or, anything in between!
    Got a cool addition, please reach out!
*/

// Global variable that acts as API
const DEVWIDGET = (function() {
    let localENV = 'PROD',
        initialized = false,
        devData = {};

    let dragging = false;

    function initializeDevEnv() {
        const html = document.querySelector('html');

        // Test the envioment variable to detemine if the widgit should continue loading.
        try {
            if(window.location.search) {
                // The url param to use to consider dev ENV
                const regex = new RegExp('[\\?&]' + 'debug' + '=([^&#]*)');
                const results = regex.exec(location.search);
                const value = results === null ? false : decodeURIComponent(results[1].replace(/\+/g, ' '));
                // Warn if debug was in the url and it was not set to DEV
                if(value && value !== 'true')
                    throw 'Template url is set to Production';
            } else if(ENV !== 'DEV') {
                throw new Error('Template enviorment is not set to DEV');
            }
        } catch (error) {
                return typeof error === 'object' 
                    ? console.error(error) : console.warn(error);  
        }
        
        // attempt to load the widget
        try {
            
            let head = html.querySelector('head'),
                body = html.querySelector('body');

            if(!head) head = html;
            if(!body) body = html;

            const parser = new DOMParser();

            localENV = 'DEV';

            // Check for a pre loaded Dev Widget
            if(!html.querySelector('.dev-widget')) {
                 // Parse the Raw HTML as HTML Document
                const widgetHTML = parser.parseFromString(getRAWHTML(), "text/html");
                body.append(widgetHTML.querySelector('.dev-widget'));
            } else {
                console.warn('An dev widget was pre-loaded in the DOM');
            }
            if(!head.querySelector('link[href*="dev.css"]')) {
                const styleHTML = parser.parseFromString(getRAWCSS(), "text/html"),
                    style = styleHTML.querySelector('style');
                head.append(style);
            } else {
                console.warn('A dev.css file was pre-loaded in the DOM')
            }
        } catch (error) {
            return console.warn(error);
        }

        // Attempt to load data from the local storage
        try {
            if(!localStorage.length) throw new Error();
            devData = JSON.parse(localStorage.getItem('devController'));
            if(!Object.keys(devData).length) throw new Error({message: 'Dev Data storaged in local storage has no keys'}); 
        } catch(e) {
            if(Object.keys(e).length) return console.log('Error finding Dev Data', e);
            return console.warn(`
Welcome to CasparCG HTML Developer Widget.
To begin, simply click a playout command, enter a custom command, or set a background color using a HEX, RGB, or RGBA value.
The position input can work with or without commas, a space is required at minimum.`);
        }
        
        // Call all the function there is data for
        Object.keys(devData).forEach((key, index) => {
            if(devData[key]) {
                // Load the features required percieve persistance
                switch(key) {
                    case 'position': 
                        updateWidgetPosition(devData[key]);
                        break;
                    case 'backgroundColor': 
                        updateBackgroundColor(devData[key]);
                        break;
                    case 'display': 
                        updateDisplay(devData[key]);
                        break;
                    case 'customControl': 
                        updateCustomCommand(devData[key]);
                        break;
                }
            } else {
                console.warn(`Dev Data has an invalid or null value for key: ${key}, ${devData[key]}`);
            }
        });

        // Try and add all the event inital listeners for widget
        try {
            addAttrValues([
                {
                    elem: '.dev-widget-visibility button',
                    all: true,
                    event: true,
                    attr: 'click',
                    value: updateDisplay
                }, {
                    elem: ['.dev-widget-control', '.dev-widget-update'],
                    all: [true, false],
                    event: true,
                    attr: 'click',
                    value: runPlayoutCommand
                }, {
                    elem: '.dev-widget-position',
                    event: true,
                    attr: 'blur',
                    value: updateWidgetPosition
                }, {
                    elem: '.dev-widget-background-color',
                    event: true,
                    attr: 'blur',
                    value: updateBackgroundColor
                } , {
                    elem: '.dev-widget-custom-command',
                    event: true,
                    attr: 'blur',
                    value: updateCustomCommand
                }, {
                    elem: ['.dev-widget-visibility button', '.dev-widget-position-con button'],
                    event: true,
                    all: [true, false],
                    attr: 'mousedown',
                    value: toggleDragWidget
                }, {
                    elem: '.dev-widget-widget',
                    event: true,
                    all: true,
                    attr: 'mouseup',
                    value: toggleDragWidget
                }, {
                    elem: window,
                    event: true,
                    attr: 'unload',
                    value: () => saveWidgetData(devData)
                }


            ])
        } catch (error) {
            
        }

        initialized = true;
    }

    initializeDevEnv();

    // Compares the update sent and current data and saves it to local storage
    function saveWidgetData(update) {
        if(!initialized) return;
        devData = compareObjects(update, devData);
        localStorage.setItem('devController', JSON.stringify(devData));
    }

    function updateDisplay(e) {
        console.log(e)
    }

    function runPlayoutCommand(e) {
        console.log(e)
    }

    // Sets the widgets position on the screen. 
    //Can exept Top, Bottom, Right, Left, and or a set of pixel values
    // @param {object} top, right - The positions of the widget
    function updateWidgetPosition(positions) {
        if(!positions) throw new Error('No positions passed to update widget position');
        if(positions.target) positions = positions.target.value;
        try {
            const devController = document.querySelector('.dev-widget');
            const input = document.querySelector('.dev-widget-position');
            const convertEmToPx = em => {
                if(typeof em === 'string') em = parseFloat(em);
                if(isNaN(em)) throw new Error('Can not parse em value');
                return em * parseInt(getComputedStyle(devController).fontSize)
            },
            convertRemToPx = rem => {
                if(typeof rem === 'string') rem = parseFloat(rem);
                if(isNaN(rem)) throw new Error('Can not parse rem value');
                return rem *  parseInt(getComputedStyle(document.querySelector('html')).fontSize)
            }
            // The computed styles of the wdiget
            const values = getElemComputedStyles({
                elem: devController, 
                attrs: ['width', 'height', 'margin-top', 'margin-left'], 
                ops: 'all'
            });

            let convertedPostions = {
                top: 0,
                left: 0
            };

            // Get the widgets total sizes
            values.totalHeight = values.height + values["margin-top"] * 4;
            values.totalWidth = values.width + values["margin-left"] * 4;

            if(typeof positions === 'string') {
                // Chack for commas or spaces
                if(positions.indexOf(',') > -1 || positions.indexOf(' ') > -1) {
                    positions = positions.split(/,|\s/g).filter(i => i && i.trim()).slice(0,2);
                } else {
                    positions = [positions, positions];
                }
            } else if(typeof positions === 'object' && !Array.isArray(positions)) {
                // Check for top and left values on the object, else set to 0
                const arr = [];
                arr[0] = positions.top ? positions.top : 0 ;
                arr[1] = positions.left ? positions.left : 0;
                positions = arr;
            }

            // For the top and left positions
            positions.forEach((item, i) => {
                // Check for REM, EM, or PX
                if(isNaN(item)) {
                item = item.toLowerCase();
                    if(item.indexOf('rem') > 0) {
                        convertedPostions[Object.keys(convertedPostions)[i]] = 
                            convertRemToPx(item.substring(0, item.indexOf('rem')));
                    } else if(item.indexOf('em') > 0) {
                        convertedPostions[Object.keys(convertedPostions)[i]] = 
                            convertEmToPx(item.substring(0, item.indexOf('em')));
                    } else if(item.indexOf('px') > 0) {
                        convertedPostions[Object.keys(convertedPostions)[i]] = item.substring(0, item.indexOf('px'));
                    } else {
                        //Keyword Check - Options: Top, Center, Bottom, Left, Right
                        switch(item) {
                            case 'top':
                            case 'left':
                                    convertedPostions[Object.keys(convertedPostions)[i]] = 50;
                                    break
                            case 'center':
                                convertedPostions[Object.keys(convertedPostions)[i]] = 
                                    i === 0 
                                        ? window.innerHeight / 2 - values.totalHeight / 2 
                                        : window.innerWidth / 2 - values.totalWidth / 2;
                                break;
                            case 'bottom':
                                convertedPostions[Object.keys(convertedPostions)[i]] = window.innerHeight - devController.clientHeight;
                                break;
                            case 'right':
                                    convertedPostions[Object.keys(convertedPostions)[i]] = window.innerWidth - devController.clientWidth;
                                    break;
                            default: 
                                throw `"${item}" is not a valid position or keyword`;
                        }
                    }
                } else {
                    convertedPostions[Object.keys(convertedPostions)[i]] = item;
                }
               if(convertedPostions[Object.keys(convertedPostions)[i]] < 0) 
                    convertedPostions[Object.keys(convertedPostions)[i]] = 0;
            });
            if(convertedPostions.top > window.innerHeight - values.totalHeight) 
                convertedPostions.top = window.innerHeight - values.totalHeight;
            if(convertedPostions.left > window.innerWidth - values.totalWidth)
                convertedPostions.left = window.innerWidth - values.totalWidth;

            devController.style.top = convertedPostions.top + 'px';
            devController.style.left = convertedPostions.left + 'px';

            input.value = `${positions[0]}, ${positions[1]}`;

            devData.position = {
                top: convertedPostions.top,
                left: convertedPostions.left
            };

            if(!dragging) {
                console.log(`Widget is now positioned at ${devController.style.top} X / ${devController.style.left} Y.`);
                return saveWidgetData({position: positions});
            }

        } catch (error) {
            let message = typeof error === 'object' ? error.message : error;
            return console.error(`There was an error setting the widgets positions. ${message}`);
        }
    }

    function dragWidget(e) {
        if(dragging) return updateWidgetPosition([e.clientY - 20, e.clientX - 20]);
    }

    function toggleDragWidget(e) {
        if(e.type === 'mousedown') {
            dragging = true;
            document.addEventListener('mousemove', dragWidget);
        } else {
            dragging = false;
            document.removeEventListener('mousemove', dragWidget);
        }
    }

    function updateBackgroundColor() {

    }

    function updateCustomCommand() {

    }

    /* Playout Controls

    */

    function play() {
        console.log('play')
    }

    /* Helper Funtions
        @function addStyleValues - Adds the width, height or both to a value
        @function getElemComputedStyles 
            - Returns the computed styles of an element as a total or object of all the values
    */

    //  Checks for spaces in a value and if they are found, splits and adds each value together
    //  @param {string} value - The string to check for spaces or return as a number
    //  @return {number} - The sum of the value passed in.
    function addStyleValues(value, width, height) {
        if(value.indexOf(' ') !== -1) {
            const values = value.split(' ');
            value = values.reduce((acc, val, index) => {
                if(index % 2 !== 0 && !width) return acc;
                if(index % 2 === 0 && !height) return acc;
                acc = values.length === 2 ? acc + (Number(val)* 2) : acc + Number(val);
                return acc;
            }, 0);
            return value;
        } else {
            return Number(value);
        }
    }


    // Takes an element and returns the computed styles as a total or object of all the values
    // @param {string || DOM node} elem - The elemnt to get the style from
    // @param {string || array} attrs - The attribute/s that need to have their values computed
    // @param {object} direction - The direction to compute. width or height
    // @param {string} operation - The operation to perform on the attribute values
    function getElemComputedStyles({elem, attrs, direction, ops}) {
        if(!elem || !attrs) throw 'Missing element or attributes for getElemComputedStyles';
        if(typeof elem === 'string') elem = document.querySelector(elem);
        if(!direction) direction = {width: true, height: false};
        const compStyles = window.getComputedStyle(elem);
        try {
            if(Array.isArray(attrs)) {
                return attrs.reduce((acc, prop, i) => {
                    const rawValue = compStyles.getPropertyValue(prop).replace(/px/g, '');
                    const value = addStyleValues(rawValue, direction.width, direction.height);
                    if(isNaN(value)) throw new Error(`${prop} could not be used`);
                    const operation = Array.isArray(ops) && ops[i] 
                        ? ops[i] : ops; 
                    switch(operation) {
                        case 'add': 
                        default:
                            acc.total += value;
                            break;
                        case 'subtract':
                            acc.total -= value;
                            break;
                        case 'multiple':
                            acc.total *= value;
                            break;
                        case 'divide': 
                            acc.total /= value;
                            break;
                        case 'all':
                            acc[prop] = value
                            break;
                    }
                    return acc;
                }, {total: 0});
            } else {
                return addStyleValues(compStyles.getPropertyValue(attrs).replace(/px/g, ''), direction.width, direction.height);
            }
        } catch (error) {
            return console.error(error);
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

    function checkElement(e, all) {
        if(typeof e === 'string') {
            if(all) {
                return [...document.querySelectorAll(e)]
            } else {
                return [document.querySelector(e)];
            }
        } else if(Array.isArray(e)) {
            return e.reduce((acc, item, i) => {
                if(typeof item === 'string') {
                    let checkAll = Array.isArray(all) ? all[i] : all
                    if(checkAll) {
                        acc.push(...document.querySelectorAll(e));
                    } else {
                        acc.push(document.querySelector(e));
                    }
                } else {
                    acc.push(item);
                }
                return acc;
            }, []);
        } else {
            return [e];
        }
    }

    function addAttrValues(data) {
        const findClosest = (arr, t) => Array.isArray(arr) 
            ? arr.find((item, i) => i >= t) : arr;

        if(Array.isArray(data)) {
            try {
                data.forEach((item, i) => {
                    if(item.attr === undefined) throw new Error('Error with item in array: ' + item.attr);
                    item.elem = checkElement(item.elem, item.all);
                    item.elem.forEach((e,i) => {
                        const attr = findClosest(item.attr, i);
                        const value = findClosest(item.value, i);
                        item.event ? e.addEventListener(attr, value) : e.addAttribute(attr, value);
                    })
                });
            } catch (error) {
                return console.error(error);
            }
        } else if(typeof data === 'object') {
            try {
                if(item.attr === undefined) throw new Error('Error with item in obj: ' + item.attr);
                if(typeof item.elem === 'string') item.elem = document.querySelector(item.elem);
                item.elem.addAttribute(item.attr, item.value);
            } catch (error) {
                return console.error(error);
            }
        } else {
            return console.error(`Invalid data element: ${data}`);
        }
    }


    /* 

    */

    function getRAWHTML() {
        return `
<!-- CasparCG HTML Tempalte Developer Widget -->
<div class="dev-controller open">
    <!-- Visibility Controls -->
    <button class="hide" onclick="hideControls()"></button>
    <button class="shrink" onclick="shrinkControls()"></button>
    <button class="invis" onclick="removeBackground(event)"></button>
    <!-- Template Options -->
    <div class="options span-columns">
        <input type="text" class="position" onblur="moveWidget(event)" placeholder="Top, Bottom, Right, Left"/>
        <input id="dev-bkg-color" type="text" placeholder="Set Background Color" onblur="setBackgroundColor(event)"/>
        <div class="custom-command">
            <input id="dev-custom-commands" type="text" onblur="setCustomCommand(event)" placeholder="Custom Command"/>
            <button type="button" onclick="runCustomCommand()">Run</button>
        </div>
    </div>
    <!-- Playout Controls -->
    <div class="controls span-columns">
            <button class="play control" ></button>
            <button class="next control" onclick="next()" ></button>
            <button class="stop control" onclick="stop()" ></button>
        </div>
</div>
`
    }

    function getRAWCSS() {
        return `

`
    }

    return {
        /*

        */
        // Returns the top and left positions
        widgetPosition: function() {return devData.position},
        // Set Widget position
        setWidgetPosition: function(position) {
            return updateWidgetPosition(position);
        },
        // Returns the background color as an rgba value
        backgroundColor: function() {return devData.backgroundColor},
        // Sets the background color
        // @param {string} color - A HEX, RGB, or RGBA value that will be used to set the background color.
        setBackgroundColor: function(color) {

        },

        /*

        */
        help: 
        `
We are here to help!
Run .propYouWantHelpWith.helpType for more help with the value or method.
Ex. DEVWIDGET.position.propHelp will tell you about the position value returned.
    DEVWIDGET.position.methodHelp will tell you how to set the widget's position.

The options are
    .backgroundColor
    .widgetBackgroundColor
    .position
`,
        backgroundColor: {
            propHelp: 
`
DEVWIDGET.backgroundcolor(asHEX)
Returns the background color as an RGBA or HEX value
`,
            methodHelp: 
`
DEVWIDGET.setBackgroundcolor(color, {opacity, invert, type})
    Adjusts then sets the color. A null or empty object will just set the background color.
        color - The HEX, RGB, or RGBA value. EX: #123 or #131123 or 0,0,0 or 0,0,0,1 or rgb(0,0,0) or rgba(0,0,0,.5)
        opacity - A percentage or 0 to 1 value.
        invert - Will invert the color.
        type - Forces the color to be a HEX value or RGB value.
`
        },
        position: {
            propHelp:
`
DEVWIDGET.widgetPosition()
Returns an object with top and left positions for the widget.
`,
            methodHelp: 
`
DEVWIDGET.setWidgetPosition(position)
    Moves the widget to a position on the screen.
            position - A string or array with the new position of the widget. 
                It can be px, em, rem or keywords like top, bottom, center, left, and or right.
`
        }
    }
    
}());


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

const setElementProperties = data => {

}

// Compares the update sent and current data and saves it to local storage
const saveDevData = (update) => {
    devData = compareObjects(update, devData);
    localStorage.setItem('devController', JSON.stringify(devData));
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
/*

*/


// Loads the Dev Widget
//initializeDevEnv();