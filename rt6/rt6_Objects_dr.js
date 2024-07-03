import {Ray, Point, ImagePlane, Color, IntersectData} from "./rt6_AuxObjects_dr.js";
import {bgColor} from "./rt6_main_dr.js";

let MAX_DEPTH = 6;

class World {
    constructor(imageDimension, airEta, planeOrigin, cameraPOS, lookat, up) {
        this.objectList = [];
        this.lightList = [];
        this.imagePlane = new ImagePlane(imageDimension, planeOrigin);
        this.camera = new Camera(cameraPOS, lookat, up);
        this.airEta = airEta;
    }

    addObj(object) {
        this.objectList.push(object);
    }

    addLight(light) {
        this.lightList.push(light);
    }

    transform(object) {}

    transformAllObjects() {}

    spawnViewRay(pixelX, pixelY, pixelZ) {
        return new Ray(this.camera.getPOS(), vec3.fromValues(pixelX, pixelY, pixelZ));
    }

    illuminate(incidentRay, depth, isInside) {
        let objList = this.objectList;
        let closestResult = 10000.0;
        let closestObject = -1;
        let allResults = new Array(objList.length);
        let inRGB = vec3.create();
        let outRGB = vec3.create();

        // find the closest object
        for (let objIndex = 0; objIndex < objList.length; objIndex++) {
            let curObj = objList[objIndex];
            // result is distance - int point (3) - int normal (3)
            allResults[objIndex] = curObj.intersect(incidentRay);
            if (allResults[objIndex][0] !== -1 && allResults[objIndex][0] < closestResult) {
                closestObject = objIndex;
                closestResult = allResults[objIndex][0];
            }
        }

        // ray did not intersect an object
        if (closestObject === -1) {
            vec3.add(outRGB, inRGB, bgColor);
        // ray did intersect an object
        } else {
            let closeObj = objList[closestObject];
            let intersectData = new IntersectData(allResults[closestObject], incidentRay, this.lightList[0]);
            let shadowRay = this.spawnShadowRay(intersectData.intPoint, intersectData.lightData.position.loc);
            inRGB = closeObj.getColor(intersectData.intPoint);
            outRGB = closeObj.material.illuminate(intersectData, inRGB, shadowRay, closeObj);

            if (depth < MAX_DEPTH) {
                // handle reflection
                if (closeObj.kr[0] > 0.0) {
                    let rayDir = this.reflectDir(incidentRay, intersectData.intPoint, intersectData.intNormal);
                    let reflectedRay = new Ray(intersectData.intPoint, rayDir);

                    let reflectRGB = vec3.create();
                    vec3.multiply(reflectRGB, closeObj.kr, this.illuminate(reflectedRay, depth + 1, isInside));
                    vec3.add(outRGB, outRGB, reflectRGB);
                }

                // handle transmission
                if (closeObj.kt[0] > 0.0) {
                    let transmissionRay;

                    // if eta's match, ray does not change
                    if (closeObj.eta === this.airEta) {
                        // create new ray from intersection with same direction
                        let origin = vec3.create();
                        vec3.add(origin, origin, intersectData.intPoint);
                        let end = vec3.create();
                        vec3.add(end, origin, incidentRay.direction.direction);

                        let nudge = vec3.create();
                        vec3.multiply(nudge, incidentRay.direction.direction, [0.2, 0.2, 0.2]);
                        vec3.add(origin, origin, nudge);

                        transmissionRay = new Ray(origin, end);
                    } else {
                        //if etas don't match, create new ray from intersection with refracted direction
                        let zeroVec3 = vec3.fromValues(0.0, 0.0, 0.0);
                        let origin = vec3.create();
                        vec3.add(origin, origin, intersectData.intPoint);
                        let rayDir = this.transmissionDir(incidentRay,
                            intersectData.intNormal, this.airEta, closeObj.eta, isInside);

                        if (vec3.exactEquals(rayDir, zeroVec3)) {
                            // ray was reflected; get reflected direction and use this ray
                            rayDir = this.reflectDir(incidentRay, intersectData.intPoint, intersectData.intNormal);

                            // using the direction result as an end point works here
                            transmissionRay = new Ray(origin, rayDir);
                        } else {
                            // ray was not reflected off surface
                            // move new origin away from sphere edge in direction of incident ray
                            let nudge = vec3.create();
                            vec3.multiply(nudge, incidentRay.direction.direction, [0.2, 0.2, 0.2]);
                            vec3.add(origin, origin, nudge);

                            let end = vec3.create();
                            vec3.add(end, origin, rayDir);

                            transmissionRay = new Ray(origin, end);
                            isInside = !isInside;
                        }
                    }

                    let transmissionRGB = vec3.create();
                    vec3.multiply(transmissionRGB, closeObj.kt, this.illuminate(
                        transmissionRay, depth + 1, isInside));
                    vec3.add(outRGB, outRGB, transmissionRGB);
                }
            }
        }
        return outRGB;
    }

    reflectDir(ray, intersectPoint, intersectNormal) {
        // returns the perfect reflection vector
        // R = I - 2 * N * dot(I, N)
        let I = vec3.create();
        let R = vec3.create();
        let N = intersectNormal;

        vec3.subtract(I, ray.origin.loc, intersectPoint);
        vec3.normalize(I, I);

        let dotPro = 2 * (vec3.dot(I, N));
        dotPro = vec3.fromValues(dotPro, dotPro, dotPro);

        let rightTerm = vec3.create();
        vec3.multiply(rightTerm, N, dotPro);

        vec3.subtract(R, rightTerm, I);

        // turn R vector into the ray's end point
        vec3.add(R, intersectPoint, R);

        return R;
    }

    transmissionDir(ray, intNormal, etaI, etaT, inside) {
        // T = ηitD + (ηit (−D ⋅ N) − 1 + (ηit^2 ((−D ⋅ N)^2 − 1)))N
        let T = vec3.create();
        let D = vec3.create();
        D = vec3.add(D, D, ray.direction.direction);
        let N = vec3.create();
        N = vec3.add(N, N, intNormal);
        let etaIT;
        let leftTerm = vec3.create();

        if (inside) {
            vec3.multiply(N, N, [-1.0, -1.0, -1.0]);
            etaIT = etaT / etaI;
        } else {
            etaIT = etaI / etaT;
        }

        let etaITVec = vec3.fromValues(etaIT, etaIT, etaIT);

        // left term, ηitD
        vec3.multiply(leftTerm, etaITVec, D);

        //right term, (ηit (−D ⋅ N) − sqrt(1 + (ηit^2 ((−D ⋅ N)^2 − 1))))N
        vec3.multiply(D, D, [-1.0, -1.0, -1.0]); // gets -D
        let dotDN = vec3.dot(D, N);
        let step1 = dotDN * dotDN; // (−D ⋅ N)^2
        let step2 = etaIT * etaIT; // ηit^2
        //TODO reference slide switches first +/- in following step
        let TIRvalue = 1 + (step2 * (step1 - 1)); // 1 + (ηit^2 ((−D ⋅ N)^2 − 1))

        // TIR; use reflected ray
        if (TIRvalue < 0) {
            return vec3.fromValues(0.0, 0.0, 0.0);
        }

        let step3 = Math.sqrt(TIRvalue); // sqrt(1 + (ηit^2 ((−D ⋅ N)^2 − 1)))
        let step4 = etaIT * dotDN; // ηit (−D ⋅ N)
        let step5 = step4 - step3; // ηit (−D ⋅ N) − sqrt(1 + (ηit^2 ((−D ⋅ N)^2 − 1)))

        let rightTerm = vec3.fromValues(step5, step5, step5);
        vec3.multiply(rightTerm, rightTerm, N);

        vec3.add(T, leftTerm, rightTerm);
        return T;
    }

    spawnShadowRay(intersectionPOS, lightPOS) {
        // create a nudge to avoid self-intersection
        let nudge = vec3.create();
        vec3.multiply(nudge, lightPOS, [0.001, 0.001, 0.001]);
        vec3.add(intersectionPOS, intersectionPOS, nudge);

        return new Ray(intersectionPOS, lightPOS);
    }

    faceForward(N, rayDirection) {
        // For acute angles, dot product is non-negative
        if (vec3.dot(N, rayDirection) >= 0 ) return N;

        // Obtuse angle, reverse the first vector
        vec3.multiply(N, N, [-1.0, -1.0, -1.0]);
        return N;
    }
}

class anObject {
    constructor(illumModel, objectColor, ambient, diffuse, specular, inKA, inKD,
                inKS, inKE, reflect, transparent, eta) {
        this.material = illumModel;
        this.color = new Color(objectColor);
        this.ambient = vec3.fromValues(ambient[0], ambient[1], ambient[2]);
        this.diffuse = vec3.fromValues(diffuse[0], diffuse[1], diffuse[2]);
        this.specular = vec3.fromValues(specular[0], specular[1], specular[2]);
        this.ka = vec3.fromValues(inKA, inKA, inKA);
        this.kd = vec3.fromValues(inKD, inKD, inKD);
        this.ks = vec3.fromValues(inKS, inKS, inKS);
        this.ke = inKE;
        this.kr = vec3.fromValues(reflect, reflect, reflect);
        this.kt = vec3.fromValues(transparent, transparent, transparent);
        this.eta = eta;
    }

    intersect(ray) {}

    getColor() {
        return this.color;
    }
}

class Sphere extends anObject {
    constructor(illumModel, objectColor, ambient, diffuse, specular, inKA, inKD,
                inKS, inKE, reflect, transparent, eta, center, radius) {
        super(illumModel, objectColor, ambient, diffuse, specular, inKA, inKD,
            inKS, inKE, reflect, transparent, eta);
        this.center = center;
        this.radius = radius;
        //this.counter = 0; // debug
    }

    intersect(ray) {
        //this.counter++; // debug
        let ro = ray.origin.loc;
        // console.log("Ray origin: " + ro);
        let rd = vec3.fromValues(ray.direction.direction[0], ray.direction.direction[1], ray.direction.direction[2]);
        // console.log("Ray direction: " + rd);

        vec3.normalize(rd, rd);
        //console.log("Ray direction normalized: " + rd);
        let ce = vec3.fromValues(this.center[0], this.center[1], this.center[2]);
        let oc = vec3.create();
        let t, c, h; // floats

        vec3.subtract(oc, ro, ce);
        t = vec3.dot(oc, rd);
        c = vec3.dot(oc, oc) - (this.radius * this.radius);
        h = (t * t) - c;
        if (h < 0.0) return vec2.fromValues(-1.0, -1.0); // no intersection
        h = Math.sqrt(h);

        // calculate intersection data
        let intPoint = vec3.create();
        let dist = (-t-h < -t+h) ? -t-h : -t+h;

        if (dist < 0) return vec2.fromValues(-1.0, -1.0); // intersection behind ray

        // get intersection:  ray origin + norm(vector) * distance
        let normVectDist = vec3.fromValues(rd[0] * dist, rd[1] * dist, rd[2] * dist);
        vec3.add(intPoint, ray.origin.loc, normVectDist);

        let intPointNormal = vec3.create();
        vec3.subtract(intPointNormal, intPoint, this.center);

        return [dist, intPoint[0], intPoint[1], intPoint[2], intPointNormal[0], intPointNormal[1], intPointNormal[2]];
    }
}

class Quad extends anObject {
    normal;
    points;
    vertices;
    width;
    height;
    constructor(illumModel, objectColor, ambient, diffuse, specular, inKA, inKD,
                inKS, inKE, reflect, transparent, eta, platformCenter,
                platformXScale, platformYScale) {
        super(illumModel, objectColor, ambient, diffuse, specular, inKA, inKD,
            inKS, inKE, reflect, transparent, eta);
        this.createVertices(platformCenter, platformXScale, platformYScale);
        this.width = platformXScale;
        this.height = platformYScale;
        // this.counter = 0; // debug
    }

    createVertices(platformCenter, platformXScale, platformYScale) {
        let xC = platformCenter[0];
        let yC = platformCenter[1];
        let zC = platformCenter[2];
        let width = platformXScale / 2;
        let height = platformYScale / 2;
        let pointArray = new Array(12);
        let vertArray = new Array(6);

        pointArray[0] = xC - width;
        pointArray[1] = yC;
        pointArray[2] = zC + height;

        pointArray[3] = xC + width;
        pointArray[4] = yC;
        pointArray[5] = zC + height;

        pointArray[6] = xC + width;
        pointArray[7] = yC;
        pointArray[8] = zC - height;

        pointArray[9] = xC - width;
        pointArray[10] = yC;
        pointArray[11] = zC - height;
        this.points = pointArray;

        vertArray[0] = vec3.fromValues(pointArray[0], pointArray[1], pointArray[2]);
        vertArray[1] = vec3.fromValues(pointArray[3], pointArray[4], pointArray[5]);
        vertArray[2] = vec3.fromValues(pointArray[6], pointArray[7], pointArray[8]);
        vertArray[3] = vertArray[2];
        vertArray[4] = vec3.fromValues(pointArray[9], pointArray[10], pointArray[11]);
        vertArray[5] = vertArray[0];

        this.vertices = vertArray;

        let side1 = vec3.create();
        vec3.subtract(side1, vertArray[1], vertArray[2]);
        let side2 = vec3.create();
        vec3.subtract(side2, vertArray[1], vertArray[0]);

        let cross = vec3.create();
        vec3.cross(cross, side1, side2);
        vec3.normalize(cross, cross);
        this.normal = cross;
    }

    intersect(ray) {
        // Möller–Trumbore intersection algorithm
        // this.counter++; // debug
        let EPSILON = Number.EPSILON;
        let isIntersection;
        let noIntersection = vec2.fromValues(-1, -1);

        let vertex0, vertex1, vertex2;
        let edge1 = vec3.create();
        let edge2 = vec3.create();
        let h = vec3.create();
        let s = vec3.create();
        let q = vec3.create();
        let a, f, u, v, t;
        let rd = ray.direction.direction;

        for (let count = 0; count < 6; count += 3) {
            isIntersection = true;
            vertex0 = this.vertices[count];
            vertex1 = this.vertices[count + 1];
            vertex2 = this.vertices[count + 2];
            vec3.subtract(edge1, vertex1, vertex0);
            vec3.subtract(edge2, vertex2, vertex0);
            vec3.cross(h, rd, edge2);
            //vec3.cross(h, ray.direction, edge2);
            a = vec3.dot(edge1, h);
            if (a > -EPSILON && a < EPSILON) {
                isIntersection = false;    // This ray is parallel to this triangle.
            }

            f = 1.0 / a;
            vec3.subtract(s, ray.origin.loc, vertex0);
            u = f * vec3.dot(s, h);
            if (u < 0.0 || u > 1.0) {
                isIntersection = false;
            }

            vec3.cross(q, s, edge1);
            v = f * vec3.dot(rd, q);
            //v = f * vec3.dot(ray.direction, q);
            if (v < 0.0 || u + v > 1.0) {
                isIntersection = false;
            }

            t = f * vec3.dot(edge2, q);
            // let outIntersectionPoint = vec3.fromValues(0.0, 0.0, 0.0);
            if (t < EPSILON) { // intersection is behind origin
                isIntersection = false;
            }

            if (isIntersection) {
                // calculate intersection data
                let intPoint = vec3.create();

                // get intersection:  ray origin + norm(vector) * distance
                let normVectDist = vec3.fromValues(rd[0] * t, rd[1] * t, rd[2] * t);
                vec3.add(intPoint, ray.origin.loc, normVectDist);

                return [t, intPoint[0], intPoint[1], intPoint[2], this.normal[0], this.normal[1], this.normal[2]];
            }
        }
        return noIntersection;
    }

    getColor(intersectionPoint) {
        let xCoord = Math.abs(this.vertices[4][0]) + intersectionPoint[0];
        let zCoord = Math.abs(this.vertices[4][2]) + intersectionPoint[2];
        let checkSize;

        checkSize = this.width / 12;

        let col = Math.floor(xCoord / checkSize);
        let row = Math.floor(zCoord / checkSize);

        if ((row + col) % 2 === 0) {
            return new Color([1.0, 0.0, 0.0]);
        } else {
            return new Color([1.0, 1.0, 0.0]);
        }
    }
}

class Camera {
    constructor(position, lookat, up) {
        this.position = position;
        this.lookat = lookat;
        this.up = up;
    }

    getPOS() {return this.position;}

    render(world) {

    }
}

class LightSource {
    constructor(lightPOS, lightRGB) {
        this.position = new Point(lightPOS);
        this.color = new Color(lightRGB);
    }
}

export {World, Sphere, Quad, Camera, LightSource}
