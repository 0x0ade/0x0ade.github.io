(()=>{

var canvas = document.getElementById('bg');
var main = document.getElementById('main');

var gl = null;

try {
    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
} catch(e) {
}

if (!gl)
    return;

var mouse = [0.5, 0.5];
document.addEventListener('mousemove', e => {
    mouse[0] = e.clientX / canvas.clientWidth - 0.5;
    mouse[1] = 1.0 - e.clientY / canvas.clientHeight - 0.5;
}, false);

var motion = [0, 0];
window.addEventListener('deviceorientation', e => {
    var x = e.gamma;
    var y = -e.beta;
    var delta = [x - motion[0], y - motion[1]];
    if (Math.abs(delta[0]) < 0.2 && Math.abs(delta[1]) < 0.2)
        return;
    delta[0] -= Math.sign(delta[0]) * 0.15;
    delta[1] -= Math.sign(delta[1]) * 0.15;
    motion[0] = x;
    motion[1] = y;
    mouse[0] += delta[0] * 0.05;
    mouse[1] += delta[1] * 0.05;
}, false);

function loadShader(gl, type, src) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        var msg =
`Failed compiling shader:

--------
${type == gl.VERTEX_SHADER ? 'VERTEX_SHADER' : type == gl.FRAGMENT_SHADER ? 'FRAGMENT_SHADER' : '??'}
--------
${src}

--------
Error:
--------
${gl.getShaderInfoLog(shader)}
`;
        gl.deleteShader(shader);
        throw new Error(msg);
    }
    return shader;
}

var shaderProgram;
var programInfo;
var positionBuffer;

var renderId;

function buildContext() {
    var vertexShader = loadShader(gl, gl.VERTEX_SHADER,
        `#version 100
        precision highp float;
        
        attribute vec4 aVertexPosition;
        
        uniform mat4 uModelViewMatrix;
        uniform mat4 uProjectionMatrix;
        
        uniform vec4 uBody;
        uniform float uEdgeScale;
        uniform float uEdgeWidth;
        uniform float uEdgeCount;
        uniform float uTime;
        uniform vec2 uMouse;
        
        varying vec4 vBody;
        varying float vEdgeScale;
        varying float vEdgeWidth;
        varying float vEdgeCount;
        varying float vTime;
        varying vec2 vUV;
        varying vec2 vMouse;
        
        void main() {
            vBody = uBody;
            vEdgeScale = uEdgeScale;
            vEdgeWidth = uEdgeWidth;
            vEdgeCount = uEdgeCount;
            vTime = uTime;
            vUV = aVertexPosition.xy;
            vMouse = uMouse;
            
            gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        }
        `);
    var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER,
        `#version 100
        precision highp float;
        
        #define PI 3.14159
        #define TAU 6.28318
        
        #define round(x) (floor(x))
        
        varying vec4 vBody;
        varying float vEdgeScale;
        varying float vEdgeWidth;
        varying float vEdgeCount;
        varying float vTime;
        varying vec2 vUV;
        varying vec2 vMouse;

        float random(vec2 p) {
            return fract(cos(dot(p, vec2(23.14069263277926, 2.665144142690225))) * 123456.0);
        }
        
        float get(vec3 v) {
            float a = 0.5 + 0.5 * cos(sin(v.x * 3.8) + sin(v.y * 3.8));
            float b = 0.5 + 0.5 * sin(v.x * 0.17 + v.z * 4.0) * sin(v.y * 0.17);
            float c = 0.5 + 0.5 * sin(v.x * 2.0 - 1.0 * sin(v.y * 2.0) + v.z * 0.7);
            float d = 0.5 + 0.5 * sin(v.x + a) * sin(v.y + b) * cos(b + c + 0.1 * v.z);
            
            return a * c + b * d;
        }
        
        float crush(float f, float c) {
            return round(c * f);
        }
        
        void main() {
            vec2 uv = vUV;
            float t = vTime;
        
            // vec2 m = 0.5 + 0.5 * sin(0.5 * PI * (vMouse - 0.5));
            vec2 m = vMouse;

            float grow = 1.0 - sin(PI * 0.5 * min(1.0, max(0.0, 8.0 * distance(uv, m))));

            uv += 0.2 * m;
        
            uv += 256.0;

            uv.y += t;
        
            uv *= vEdgeWidth * 16.0;
        
            t += 0.1 * m.x;
            t += 0.1 * m.y;
        
            float cc = get(vec3(uv, t));
            cc = max(0.1, min(0.9, cc));
        
            float edgef = vEdgeScale * vEdgeWidth * 0.01;
            edgef *= 1.0 + grow * 5.0 * (cc * 2.0);

            float body =
                smoothstep(-edgef, 0.0, vUV.x - vBody.x) *
                (1.0 - smoothstep(0.0, edgef, vUV.y - vBody.y)) *
                (1.0 - smoothstep(0.0, edgef, vUV.x - vBody.z)) *
                smoothstep(-edgef, 0.0, vUV.y - vBody.w)
            ;

            float edgec = vEdgeCount * 8.0;

            // float cl = crush(edgec, get(vec3(uv.x - edgef, uv.y, t)));
            // float cr = crush(edgec, get(vec3(uv.x + edgef, uv.y, t)));
            // float cu = crush(edgec, get(vec3(uv.x, uv.y - edgef, t)));
            // float cd = crush(edgec, get(vec3(uv.x, uv.y + edgef, t)));
        
            float clu = crush(edgec, get(vec3(uv.x - edgef, uv.y - edgef, t)));
            float cru = crush(edgec, get(vec3(uv.x + edgef, uv.y - edgef, t)));
            float cld = crush(edgec, get(vec3(uv.x - edgef, uv.y + edgef, t)));
            float crd = crush(edgec, get(vec3(uv.x + edgef, uv.y + edgef, t)));
        
            float d = smoothstep(0.0, 1.0 + body,
                // abs(cl - cr) +
                // abs(cu - cd) +
                abs(clu - crd) +
                abs(cld - cru) +
                0.0 // step(0.001, fract(body))
            );

            body = step(0.0001, body);
        
            float c = (0.05 + cc * 0.95) * d;
            c = 0.05 * cc + c;

            c = (1.0 - body) * c + body * (
                0.1 + 0.2 * min(1.0, cc + c)
            );

            c += random(vUV * 3.0) * 0.01;
        
            gl_FragColor = vec4(c, c, c, 1.0);
        }
        `);
        
    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS))
        throw new Error('Shader program link failed.');
    
    programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
            body: gl.getUniformLocation(shaderProgram, 'uBody'),
            edgeScale: gl.getUniformLocation(shaderProgram, 'uEdgeScale'),
            edgeWidth: gl.getUniformLocation(shaderProgram, 'uEdgeWidth'),
            edgeCount: gl.getUniformLocation(shaderProgram, 'uEdgeCount'),
            time: gl.getUniformLocation(shaderProgram, 'uTime'),
            mouse: gl.getUniformLocation(shaderProgram, 'uMouse'),
        },
    };

    positionBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
         1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
        -1.0, -1.0,
    ]), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    renderId = requestAnimationFrame(render);    
}
canvas.addEventListener('webglcontextlost', e => {
    console.log("die");
    cancelRequestAnimationFrame(renderId);
    event.preventDefault();
}, false);
canvas.addEventListener('webglcontextrestored', e => {
    console.log("revive");
    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    canvas.width = 0;
    canvas.height = 0;
    buildContext();
}, false);
buildContext();

var nowoffs = Date.now();
var dropped = 1;
var perfscale = 1;
var then;
function render(now) {
    if (!then)
        then = now - 1000 / 60;
    if (now - then > 1000 / 30)
        dropped++;
    else if (now - then < 1000 / 50)
        dropped--;
    if (dropped > 10) {
        perfscale += 0.25;
        dropped = 0;
    } else if (dropped < -10) {
        perfscale = Math.max(0.5, perfscale * 0.75);
        dropped = 0;
    }
    then = now;
    
    gl.clearColor(0.0, 0.0, 0.0, 0.5);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var aspect = canvas.clientWidth / canvas.clientHeight;
    
    gl.useProgram(programInfo.program);

    var density = (window.devicePixelRatio || 1) / (
        gl.webkitBackingStorePixelRatio ||
        gl.mozBackingStorePixelRatio ||
        gl.msBackingStorePixelRatio ||
        gl.oBackingStorePixelRatio ||
        gl.backingStorePixelRatio ||
        1
    ) / perfscale;

    var width  = canvas.clientWidth;
    var height = canvas.clientHeight;

    var vwidth;
    var vheight;
    if (aspect < 1.0) {
        vwidth = aspect;
        vheight = 1.0;
    } else {
        vwidth = 1.0;
        vheight = 1.0 / aspect;
    }

    if (canvas.width != width * density || canvas.height != height * density) {
        canvas.width = width * density;
        canvas.height = height * density;
        gl.viewport(0, 0, canvas.width, canvas.height);

        var projectionMatrix = mat4.create();
        mat4.ortho(projectionMatrix /* = */, vwidth * -0.5, vwidth * 0.5, vheight * -0.5, vheight * 0.5, 0.1, 100.0);
        
        var modelViewMatrix = mat4.create();
        mat4.translate(modelViewMatrix /* = */, modelViewMatrix, [0.0, 0.0, -1.0]);

        gl.uniformMatrix4fv(
            programInfo.uniformLocations.projectionMatrix,
            false,
            projectionMatrix
        );
        gl.uniformMatrix4fv(
            programInfo.uniformLocations.modelViewMatrix,
            false,
            modelViewMatrix
        );

        gl.uniform1f(
            programInfo.uniformLocations.edgeScale,
            Math.max(1.0, perfscale)
        );
        gl.uniform1f(
            programInfo.uniformLocations.edgeWidth,
            100 / Math.min(width, height)
        );
        gl.uniform1f(
            programInfo.uniformLocations.edgeCount,
            Math.min(width, height) / 700
        );
    }

    
    var bodyBounds = main.getBoundingClientRect();
    gl.uniform4fv(
        programInfo.uniformLocations.body,
        [
            vwidth * (bodyBounds.x / canvas.clientWidth - 0.5),
            vheight * ((1.0 - bodyBounds.y / canvas.clientHeight) - 0.5),
            vwidth * ((bodyBounds.x + bodyBounds.width) / canvas.clientWidth - 0.5),
            vheight * ((1.0 - (bodyBounds.y + bodyBounds.height) / canvas.clientHeight) - 0.5),
        ]
    );
    
    gl.uniform1f(
        programInfo.uniformLocations.time,
        (nowoffs / 100 % 1024) + 0.03 * now / 1000
    );
    gl.uniform2fv(
        programInfo.uniformLocations.mouse,
        [vwidth * mouse[0], vheight * mouse[1]]
    );
    
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    renderId = requestAnimationFrame(render);
}

})();