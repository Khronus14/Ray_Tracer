import {World, Quad, Sphere, LightSource} from "./rt6_Objects_dr.js";
import {Phong_Pure, Phong_Blinn} from "./rt6_illumModels_dr.js";
import {altView, illumModel, altIllum} from "./rt6_events_dr.js";

let theWorld;
let camPosition = [[0.0, 0.0, 7.0], [-7.0, 0.0, 0.0]];
let planeCoords = [[0.0, 0.0, 5.0], [-5.0, 0.0, 0.0]];

function buildScene(imageDimension) {
    // z coordinate for image plane, camera, and light parameters
    let cameraPOS = camPosition[altView];
    let lookat = [0.0, 0.0, 0.0];
    let up = [0.0, 1.0, 0.0];
    let planeOrigin = planeCoords[altView];
    let worldEta = 1.0;
    let model;

    theWorld = new World(imageDimension, worldEta, planeOrigin, cameraPOS, lookat, up);
    if (illumModel === 0) {
        model = new Phong_Pure();
    } else {
        model = new Phong_Blinn();
    }

    let lightPOSMain = [0.0, 10.0, 15.0];
    let lightRGBMain = [1.0, 1.0, 1.0];
    theWorld.addLight(new LightSource(lightPOSMain, lightRGBMain));

    let gSphereCenter = [0.0, 0.0, 0.0];
    let gSphereColor = [0.0, 0.0, 0.0];
    let gSphereAmbient = [1.0, 1.0, 1.0];
    let gSphereDiffuse = [1.0, 1.0, 1.0];
    let gSphereSpecular = [1.0, 1.0, 1.0];
    let gSphereRadius = 1.5;
    let gSphereka = 0.075;
    let gSpherekd = 0.075;
    let gSphereks = 0.2;
    let gSphereke = 20.0;
    let gSphereKr = 0.0;
    let gSphereKt = 0.8;
    let gSphereEta = 0.95;
    let gSphere = new Sphere(model, gSphereColor, gSphereAmbient,
        gSphereDiffuse, gSphereSpecular, gSphereka, gSpherekd, gSphereks,
        gSphereke, gSphereKr, gSphereKt, gSphereEta, gSphereCenter,
        gSphereRadius);
    theWorld.addObj(gSphere);

    let mSphereCenter = [-2.2, -1.0, -2.0]; // [-2.2, -1.0, -2.0]
    // let mSphereCenter = [0.0, 0.0, -8.0];
    // let mSphereCenter = [-1.0, 1.5, 2.5];
    let mSphereColor = [0.0, 0.0, 0.0];
    let mSphereAmbient = [0.7, 0.7, 0.7];
    let mSphereDiffuse = [0.7, 0.7, 0.7];
    let mSphereSpecular = [1.0, 1.0, 1.0];
    let mSphereRadius = 1.0;
    let mSphereka = 0.15;
    let mSpherekd = 0.25;
    let mSphereks = 1.0;
    let mSphereke = 20.0;
    let mSphereKr = 0.75;
    let mSphereKt = 0.0;
    let mSphereEta = 1.0;
    let mSphere = new Sphere(model, mSphereColor, mSphereAmbient,
        mSphereDiffuse, mSphereSpecular, mSphereka, mSpherekd, mSphereks,
        mSphereke, mSphereKr, mSphereKt, mSphereEta, mSphereCenter,
        mSphereRadius);
    theWorld.addObj(mSphere);

    let platformCenter = [-2.5, -3.0, -8.0];
    let platformColor = [0.3, 0.3, 0.3];
    let platformAmbient = [1.0, 1.0, 1.0];
    let platformDiffuse = [1.0, 1.0, 1.0];
    let platformSpecular = [1.0, 1.0, 1.0];
    let platformXScale = 11.0;
    let platformZScale = 35.0;
    let platformka = 0.7;
    let platformkd = 0.3;
    let platformks = 1.0;
    let platformke = 15.0;
    let platformKr = 0.0;
    let platformKt = 0.0;
    let platformEta = 1.0;
    let platform = new Quad(model, platformColor, platformAmbient,
        platformDiffuse, platformSpecular, platformka, platformkd, platformks,
        platformke,  platformKr, platformKt, platformEta, platformCenter,
        platformXScale, platformZScale);
    theWorld.addObj(platform);

    let startTime = Date.now();
    rayTrace();
    let elapsedTime = (Date.now() - startTime) / 1000;
    console.log(`Rendered in ${elapsedTime.toFixed(2)} seconds.`);
}

function rayTrace() {
    let posArr = theWorld.imagePlane.posArray;
    let colorArr = theWorld.imagePlane.colorArray;
    let counter = 0; // debug

    for (let arrIndex = 0; arrIndex < posArr.length; arrIndex += 3) {
        let outRGB = vec3.create();

        counter++; // debug

        let pixelRay = theWorld.spawnViewRay(posArr[arrIndex], posArr[arrIndex + 1],
            posArr[arrIndex + 2]);

        // if (counter === 400500) { // center-mass
        //     console.log("At pixel: " + counter);
        // }
        if (altIllum === 0) {
            outRGB = theWorld.illuminate(pixelRay, 0, false);
        } else {
            // paint the screen magenta
            outRGB = [0.7, 0.0, 0.6];
        }

        colorArr[arrIndex] = outRGB[0];
        colorArr[arrIndex + 1] = outRGB[1];
        colorArr[arrIndex + 2] = outRGB[2];
    }
}

export {buildScene, rayTrace, theWorld}
