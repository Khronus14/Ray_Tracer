import {altView} from "./rt6_events_dr.js";

class Ray {
    constructor(originPOS, endPOS) {
        this.origin = new Point(originPOS);
        this.direction = new Vector(originPOS, endPOS);
    }
}

class Point {
    constructor(originPOS) {
        this.x = originPOS[0];
        this.y = originPOS[1];
        this.z = originPOS[2];
        this.loc = vec3.fromValues(this.x, this.y, this.z);
    }

    distance() {

    }

    transform() {

    }
}

class Vector {
    constructor(originPOS, endPOS) {
        this.direction = vec3.create();
        this.endPoint = vec3.fromValues(endPOS[0], endPOS[1], endPOS[2]);
        this.transform(originPOS, endPOS); // turn ray end/start-point into a vector
    }

    cross(vector) {
        let resultVector = vec3.create();
        vec3.cross(resultVector, this.direction, vector);
        return resultVector;
    }

    dot(vector) {
        return vec3.dot(this.direction, vector);
    }

    length() {
        return vec3.length(this.direction);
    }

    normalize() {
        let normVector = vec3.create();
        vec3.normalize(normVector, this.direction);
        return normVector;
    }

    transform(originPOS, endPOS) {
        vec3.subtract(this.direction, endPOS, originPOS);
        vec3.normalize(this.direction, this.direction);
    }
}

class Color {
    constructor(rgbValues) {
        this.r = rgbValues[0];
        this.g = rgbValues[1];
        this.b = rgbValues[2];
    }

    getR() {return this.r;}
    getG() {return this.g;}
    getB() {return this.b;}
    getRGB() {return vec3.fromValues(this.r, this.g, this.b);}
}

class ImagePlane {
    constructor(dimension, planeOrigin) {
        this.posArray = this.buildPOSArray(dimension, planeOrigin);
        this.colorArray = this.buildColorArray(dimension);
    }
    buildPOSArray(planeDimPixel, planeOrigin) {
        const positions = new Array(planeDimPixel * (planeDimPixel * 3));
        const planeDimCoord = 2.0;
        let xOrigin = planeOrigin[0];
        let yOrigin = planeOrigin[1];
        let zOrigin = planeOrigin[2];
        let pixelDim, pixelOffset, horizCoord, vertCoord, depthCoord;

        if (altView === 0) {
            horizCoord = xOrigin;
            vertCoord = yOrigin;
            depthCoord = zOrigin;
        } else {
            horizCoord = zOrigin;
            vertCoord = yOrigin;
            depthCoord = xOrigin
        }

        // calc pixel size and offset
        pixelDim = planeDimCoord / planeDimPixel;
        pixelOffset = pixelDim / 2;

        // find top-left pixel's center coords
        horizCoord = horizCoord - (pixelDim * (planeDimPixel / 2)) + pixelOffset;
        vertCoord = vertCoord + (pixelDim * (planeDimPixel / 2)) - pixelOffset;

        //console.log("Pixel size: " + pixelDim);
        let index = 0;
        for (let row = 0; row < planeDimPixel; row++) {
            for (let col = 0; col < planeDimPixel; col++) {
                if (altView === 0) {
                    positions[index] = horizCoord;
                    positions[index + 1] = vertCoord;
                    positions[index + 2] = depthCoord;
                } else {
                    positions[index] = depthCoord;
                    positions[index + 1] = vertCoord;
                    positions[index + 2] = horizCoord;
                }
                index += 3;
                horizCoord += pixelDim;
            }
            horizCoord = horizCoord - (pixelDim * planeDimPixel);
            vertCoord -= pixelDim;
        }
        //console.log(positions);
        return positions;
    }

    buildColorArray(planeDimPixel) {
        const colors = new Array(planeDimPixel * (planeDimPixel * 3));
        let index = 0;
        for (let row = 0; row < colors.length / 3; row++) {
            colors[index] = 0.5;
            colors[index + 1] = 0.0;
            colors[index + 2] = 0.3;

            // if (index < colors.length / 3) {
            //     colors[index] = 1;
            //     colors[index + 1] = 0;
            //     colors[index + 2] = 0;
            // } else if (index < colors.length / 1.5) {
            //     colors[index] = 0;
            //     colors[index + 1] = 1;
            //     colors[index + 2] = 0;
            // } else {
            //     colors[index] = 0;
            //     colors[index + 1] = 0;
            //     colors[index + 2] = 1;
            // }

            index += 3;
        }
        return colors;
    }
}

class IntersectData {
    intPoint;
    intNormal;
    intFromRay;
    intToLight;
    intReflect;
    viewPoint;
    lightData;
    constructor(intResults, ray, light) {
        this.lightData = light;
        this.parseResults(intResults, ray);
    }

    parseResults(intResults, ray) {
        this.intPoint = vec3.fromValues(intResults[1], intResults[2], intResults[3]);
        this.intNormal = vec3.fromValues(intResults[4], intResults[5], intResults[6]);
        vec3.normalize(this.intNormal, this.intNormal);

        // inbound vector from ray origin
        this.intFromRay = vec3.create();
        vec3.subtract(this.intFromRay, ray.origin.loc, this.intPoint);
        vec3.normalize(this.intFromRay, this.intFromRay);

        // outbound vector to light source (or destination of ray)
        this.intToLight = vec3.create();
        vec3.subtract(this.intToLight, this.lightData.position.loc, this.intPoint);
        vec3.normalize(this.intToLight, this.intToLight);

        this.viewPoint = ray.origin.loc;
    }
}

export {Ray, Point, ImagePlane, Color, Vector, IntersectData}
