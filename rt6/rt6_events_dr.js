import {startRender} from "./rt6_main_dr.js";

let altView = 0;
let illumModel = 0;
let altIllum = 0;
let checkShadow = false;

function gotKey (event) {
    const key = event.key;

    //modify camera position
    if (key === '1') {
        altView = (altView === 0) ? 1 : 0;
    }

    if (key === '2') {
        illumModel = (illumModel === 0) ? 1 : 0;
    }

    // if (key === '3') {
    //     altIllum = (altIllum === 0) ? 1 : 0;
    // }

    if (key === '4') {
        checkShadow = !checkShadow;
    }

    if (key === 'r') {
        altView = 0;
        illumModel = 0;
        altIllum = 0;
        checkShadow = false;
    }

    startRender();
}

export {gotKey, altView, illumModel, altIllum, checkShadow};
