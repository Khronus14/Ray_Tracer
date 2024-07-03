import {theWorld} from "./rt6_rayTracing_dr.js";
import {illumModel, checkShadow} from "./rt6_events_dr.js";
import {Ray} from "./rt6_AuxObjects_dr.js";

class IlluminationModel {
    constructor() {}
    illuminate() {}
}

class Phong_Base extends IlluminationModel {
    constructor() {
        super();
    }

    illuminate(intersectionData, objColor, ray, object) {
        let objList = theWorld.objectList;
        let light = theWorld.lightList[0];
        let outRGB = vec3.create();
        // variables to toggle between using multiple lights
        // term used to scale total radiance contribution

        // complete for each light source
        let ambientRGB = vec3.create();
        let diffuseRGB = vec3.create();
        let specRGB = vec3.create();
        let result;
        let blocked = false;

        // calculate ambient component
        // vec3 ambient = ka * ambientLight * baseColor;
        vec3.multiply(ambientRGB, object.ambient, objColor.getRGB());
        vec3.multiply(ambientRGB, object.ka, ambientRGB);
        vec3.add(outRGB, outRGB, ambientRGB);

        // check to see if shadow ray is blocked from the lightPOS by any object
        for (let objIndex = 0; objIndex < objList.length; objIndex++) {
            result = objList[objIndex].intersect(ray);
            if (result[0] > Number.EPSILON) {
                // if object is transparent, use ray from exit point to light
                if (checkShadow && objList[objIndex].kt[0] > 0.0) {
                    // if etas match, not blocked and use same ray
                    if (!objList[objIndex].eta === theWorld.eta) {
                        let zeroVec3 = vec3.fromValues(0.0, 0.0, 0.0);
                        let intNormal = vec3.fromValues(result[4], result[5], result[6]);

                        let rayDir = theWorld.transmissionDir(ray, intNormal,
                            theWorld.airEta, objList[objIndex].eta, false);

                        if (vec3.exactEquals(rayDir, zeroVec3)) {
                            // ray was reflected; object is blocking light
                            blocked = true;
                            break;
                        } else {
                            // ray was not reflected off surface
                            let origin = vec3.fromValues(result[1], result[2], result[3]);
                            let nudge = vec3.create();
                            vec3.multiply(nudge, ray.direction.direction, [0.2, 0.2, 0.2]);
                            vec3.add(origin, origin, nudge);
                            let end = vec3.create();
                            vec3.add(end, origin, rayDir);

                            let middleRay = new Ray(origin, end);
                            result = objList[objIndex].intersect(middleRay);
                            if (result[0] > Number.EPSILON) {
                                intNormal = vec3.fromValues(result[4], result[5], result[6]);

                                rayDir = theWorld.transmissionDir(middleRay, intNormal,
                                    theWorld.airEta, objList[objIndex].eta, true);
                                if (vec3.exactEquals(rayDir, zeroVec3)) {
                                    // ray was reflected; object is blocking light
                                    blocked = true;
                                    break;
                                } else {
                                    // ray was not reflected off surface
                                    origin = vec3.fromValues(result[1], result[2], result[3]);
                                    nudge = vec3.create();
                                    vec3.multiply(nudge, middleRay.direction.direction, [0.2, 0.2, 0.2]);
                                    vec3.add(origin, origin, nudge);
                                    let end = vec3.create();
                                    vec3.add(end, end, light.position.loc);

                                    let rayToLight = new Ray(origin, end);

                                    for (let objIndex = 0; objIndex < objList.length; objIndex++) {
                                        result = objList[objIndex].intersect(rayToLight);
                                        if (result[0] > Number.EPSILON) {
                                            blocked = true;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else {
                    blocked = true;
                    break;
                }
            }
        }

        if (!blocked) {
            // calculate diffuse component
            // vec3 diffuse = kd * lightColor * baseColor * max(dot(S, N), 0.0);
            let dotLN = Math.max(vec3.dot(intersectionData.intToLight, intersectionData.intNormal), 0.0);
            let dotLNVec3 = vec3.fromValues(dotLN, dotLN, dotLN);
            vec3.multiply(diffuseRGB, object.diffuse, dotLNVec3);
            vec3.multiply(diffuseRGB, diffuseRGB, light.color.getRGB());
            vec3.multiply(diffuseRGB, diffuseRGB, object.kd);
            vec3.add(outRGB, outRGB, diffuseRGB);

            // calculate specular component
            // vec3 spec = ks * specHighlightColor * lightColor * pow(max(dot(R, V), 0.0), ke);
            // generic call gets R for Phong_Pure, H for Phong_Blinn
            let specVector = this.getSpecVector(ray, intersectionData.intNormal);

            let V = vec3.create();
            vec3.subtract(V, intersectionData.intPoint, intersectionData.viewPoint); //TODO is viewpoint always right?
            vec3.normalize(V, V);

            let dotRVke;
            if (illumModel === 0) {
                // Phong_Pure
                dotRVke = Math.pow(Math.max(vec3.dot(specVector, V), 0.0), object.ke);
            } else {
                // Phong_Blinn
                dotRVke = Math.pow(Math.max(vec3.dot(specVector, intersectionData.intNormal), 0.0), object.ke);
            }
            let lastTerm = vec3.fromValues(dotRVke, dotRVke, dotRVke);

            vec3.multiply(specRGB, light.color.getRGB(), lastTerm);
            vec3.multiply(specRGB, specRGB, object.specular);
            vec3.multiply(specRGB, specRGB, object.ks);
            vec3.add(outRGB, outRGB, specRGB);
        }
        return outRGB;
    }

    getSpecVector() {}
}

class Phong_Pure extends Phong_Base {
    constructor(inKA, inKD, inKS, inKE, ambientColor, specularColor) {
        super(inKA, inKD, inKS, inKE, ambientColor, specularColor);
    }

    getSpecVector(ray, N) {
        // returns the perfect reflection vector for Phong
        // R = I - 2 * N * dot(I, N)
        let I = vec3.create();
        let R = vec3.create();

        vec3.subtract(I, ray.origin.loc, ray.direction.endPoint);
        vec3.normalize(I, I);

        let dotPro = 2 * (vec3.dot(I, N));
        dotPro = vec3.fromValues(dotPro, dotPro, dotPro);

        let rightTerm = vec3.create();
        vec3.multiply(rightTerm, N, dotPro);

        vec3.subtract(R, rightTerm, I);
        vec3.normalize(R, R);
        return R;
    }
}

class Phong_Blinn extends Phong_Base {
    constructor(inKA, inKD, inKS, inKE, ambientColor, specularColor) {
        super(inKA, inKD, inKS, inKE, ambientColor, specularColor);
    }

    getSpecVector(ray, N) {
        // returns the halfway vector for Phong-Blinn
        // H = (V + L) / mag(V + L)
        let L = vec3.fromValues(ray.direction.direction[0], ray.direction.direction[1], ray.direction.direction[2]);
        vec3.normalize(L, L);

        let intPOS = vec3.fromValues(ray.origin.loc[0], ray.origin.loc[1], ray.origin.loc[2]);
        let cameraPOS = theWorld.camera.getPOS();
        let V = vec3.create();
        vec3.subtract(V, cameraPOS, intPOS);
        vec3.normalize(V, V);

        let VL = vec3.create();
        vec3.add(VL, V, L);
        let magVL = vec3.length(VL);
        let magVLVec3 = vec3.fromValues(magVL, magVL, magVL);

        let H = vec3.create();
        vec3.divide(H, VL, magVLVec3);

        vec3.normalize(H, H);
        return H;
    }
}

export {Phong_Pure, Phong_Blinn}
