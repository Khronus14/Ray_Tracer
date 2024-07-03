const vShaderSource =
    `#version 300 es
    precision mediump float;
    
    in vec3 aVertexPosition;
    in vec3 aShapeColor;
    uniform mat4 uModelMatrix;
    uniform mat4 uViewMatrix;
    uniform mat4 uProjectionMatrix;
    
    out vec3 pixColor;
    
    void main() {
        pixColor = aShapeColor;
        gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aVertexPosition, 1.0);
        gl_PointSize = 1.4; // 1.4:500; 2.3:300; 7.3:100; 35.0:20
    }`;

const fShaderSource =
    `#version 300 es
    precision mediump float;
    
    in vec3 pixColor;
    out vec4 fragColor;
    
    void main() {
        fragColor = vec4(pixColor, 1.0);
    }`;

export {vShaderSource, fShaderSource};
