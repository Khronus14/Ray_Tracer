import {fShaderSource, vShaderSource} from "./rt6_shaderCode_dr.js";
import {altView, gotKey} from "./rt6_events_dr.js";
import {buildScene, theWorld} from "./rt6_rayTracing_dr.js";

let gl, program, imPlane;
let imageDimension = 1000;
let bgColor = [0.0, 0.4, 1.0];

init();

function init() {
    // get canvas
    const canvas = document.getElementById('webgl-canvas');
    if (!canvas) {
        console.error(`There is no canvas with id 'webgl-canvas' on this page.`);
        return null;
    }

    // get WebGL context
    gl = canvas.getContext("webgl2");
    if (!gl) {
        console.error(`There is no WebGL 2.0 context`);
        return null;
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0); // Set clear color to blue, fully opaque
    gl.clear(gl.COLOR_BUFFER_BIT); // Clear the color buffer with specified clear color
    gl.clearDepth(1.0); // Clear everything
    gl.enable(gl.DEPTH_TEST); // Enable depth testing
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things

    window.addEventListener('keydown', gotKey, false);

    // Initialize a shader program using shader sources
    program = gl.createProgram();

    // set shaders, attributes, and uniforms
    initializeProgram();

    startRender();
}

function initializeProgram() {
    // get shaders
    const vertexShader = getShader(gl.VERTEX_SHADER, vShaderSource);
    const fragmentShader = getShader(gl.FRAGMENT_SHADER, fShaderSource);

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    // if creating the shader program failed, alert
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Could not initialize shaders');
        return null;
    }

    program.aVertexPosition = gl.getAttribLocation(program, "aVertexPosition");
    program.aShapeColor = gl.getAttribLocation(program, "aShapeColor");
    program.uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");
    program.uModelMatrix = gl.getUniformLocation(program, "uModelMatrix");
    program.uViewMatrix = gl.getUniformLocation(program, "uViewMatrix");
    program.uBaseColor = gl.getUniformLocation(program, 'uBaseColor');

    // Tell WebGL to use our program when drawing
    gl.useProgram(program);
}

// get, compile, and return shader code
function getShader(type, source) {
    let shader;
    if (type === gl.VERTEX_SHADER) {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else if (type === gl.FRAGMENT_SHADER) {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else {
        return null;
    }

    // compile shader
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    // ensure the shader is valid
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

function startRender() {
    buildScene(imageDimension);

    // build a VAO for the image plane
    createVAO();

    // set up your camera position, orientation, and projection
    setUpCamera();

    // draw the scene
    drawScene();

    // miscellaneous code to test/verify output values, etc.
    // testAndDebug();

    console.log("Program complete.")
}

function testAndDebug() {

    let origin = vec3.fromValues(-1.0, 1.0, 1.0);
    let end = vec3.fromValues(-0.5, 1.0, 0.5);
    let dir = vec3.create();

    console.log("Origin: " + origin);

    vec3.subtract(dir, end, origin);
    console.log("Direction: " + dir);
    vec3.normalize(dir, dir);
    console.log("Normalized direction: " + dir);
    vec3.add(origin, origin, dir);

    console.log("New origin: " + origin);

    // let nudge = vec3.create();
    // vec3.multiply(nudge, end, [0.001, 0.001, 0.001]);
    // vec3.add(origin, origin, nudge);

    // let rayOrigin = vec3.fromValues(-4.0, 4.0, 4.0);
    // let vector = vec3.fromValues(0.2, 0.8, -0.2);
    // let rayTerminate = vec3.create();
    // vec3.add(rayTerminate, rayOrigin, vector);

    // let I = vec3.create();
    // let R = vec3.create();
    //
    // vec3.subtract(I, intPoint, rayOrigin);
    // console.log("Incident direction: " + I);
    // vec3.normalize(I, I);
    // console.log("Incident direction normalized: " + I);
    //
    // let dotPro = 2 * (vec3.dot(I, N));
    // dotPro = vec3.fromValues(dotPro, dotPro, dotPro);
    //
    // let rightTerm = vec3.create();
    // vec3.multiply(rightTerm, N, dotPro);
    //
    // vec3.subtract(R, rightTerm, I);
    // console.log("Reflected vector: " + R);

    // vec3.normalize(R, R);
    // console.log("Reflected vector: " + R);

    // let ray4 = vec3.fromValues(0.0, 0.4, 1.0);
    // let ray5 = vec3.fromValues(0.0, 0.7, 0.0);
    // let outRGB = vec3.create();
    //
    // vec3.add(outRGB, outRGB, ray1);
    // console.log("Ray 1: " + outRGB);
    //
    // vec3.add(outRGB, outRGB, ray2);
    // vec3.add(outRGB, outRGB, ray3);
    // vec3.add(outRGB, outRGB, ray4);
    // vec3.add(outRGB, outRGB, ray5);
    // console.log("Rays 1-5: " + outRGB);
    //
    // vec3.divide(outRGB, outRGB, [5.0, 5.0, 5.0]);
    // console.log("Final color values: " + outRGB);

    // vec3.subtract(lightVec, point, light);
    // vec3.subtract(pointVec, light, point);
    // console.log("Light vector: " + lightVec);
    // console.log("Point vector: " + pointVec);
    //
    // vec3.normalize(lightVec, lightVec);
    // vec3.normalize(pointVec, pointVec);
    // console.log("Light vector normalized: " + lightVec);
    // console.log("Point vector normalized: " + pointVec);
    //
    // vec3.inverse(light, light);
    // console.log("Light vector inverted: " + light);
}

function createVAO() {
    imPlane = theWorld.imagePlane;
    imPlane.VAO = bindVAO(imPlane);
}

function bindVAO (imPlane) {
    //create and bind VAO
    let theVAO = gl.createVertexArray();
    gl.bindVertexArray(theVAO);

    // create and bind vertex buffer
    let aVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, aVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(imPlane.posArray), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(program.aVertexPosition);
    gl.vertexAttribPointer(program.aVertexPosition, 3, gl.FLOAT, false, 0, 0);

    // create and bind vertex buffer
    let aColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, aColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(imPlane.colorArray), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(program.aShapeColor);
    gl.vertexAttribPointer(program.aShapeColor, 3, gl.FLOAT, false, 0, 0);

    // clean up
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    return theVAO;
}

function setUpCamera() {
    let projMatrix = mat4.create();
    let camPOS = [[0.0, 0.0, 6.0], [-6.0, 0.0, 0.0]];
    let lookPOS = [[0.0, 0.0, 0.0], [0.0, 0.0, 0.0]];

    // mat4.perspective(projMatrix, degToRad(90), 1, 1.0, 100.0);
    mat4.ortho(projMatrix, -1, 1, -1, 1, 0.1, 300.0);
    gl.uniformMatrix4fv(program.uProjectionMatrix, false, projMatrix);

    let viewMatrix = mat4.create();
    mat4.lookAt(viewMatrix, camPOS[altView], lookPOS[altView], [0.0, 1.0, 0.0]);
    gl.uniformMatrix4fv(program.uViewMatrix, false, viewMatrix);
}

function drawScene() {
    // clear the canvas
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // model transform
    const modelMatrix = mat4.create();
    mat4.translate(modelMatrix, modelMatrix, [0.0, 0.0, 0.0]);

    // how to use the buffers
    const first = 0;
    const vertexCount = imageDimension * imageDimension;
    gl.bindVertexArray(imPlane.VAO);
    gl.uniformMatrix4fv(program.uModelMatrix, false, modelMatrix);
    gl.drawArrays(gl.POINTS, first, vertexCount);

    // clean up
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
}

function degToRad(degrees) {return degrees * (Math.PI / 180)}

export {startRender, degToRad, bgColor};
