Main.BG = {

    dark: Main.path !== "/" && Main.path !== "/dashboard/",

    init() {
        var canvas = Main.BG.canvas = document.getElementById("bg");

        var gl = null;

        try {
            gl = Main.BG.gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        } catch(e) {
        }

        if (!gl)
            return;

        var mouse = [0.5, 0.5];
        document.addEventListener("mousemove", e => {
            mouse[0] = e.clientX / canvas.clientWidth - 0.5;
            mouse[1] = 1.0 - e.clientY / canvas.clientHeight - 0.5;
        }, false);

        // Don"t put the following util functions into Main.BG.

        function loadShader(gl, type, src) {
            var shader = gl.createShader(type);
            gl.shaderSource(shader, src);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                var msg =
`Failed compiling shader:

--------
${type == gl.VERTEX_SHADER ? "VERTEX_SHADER" : type == gl.FRAGMENT_SHADER ? "FRAGMENT_SHADER" : "??"}
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

        var shaderBG;
        var infoBG;

        var shaderBlit;
        var infoBlit;

        var rectBuffer;

        var noiseTextureWidth;
        var noiseTextureHeight;
        var noiseTexture;

        var scaleFBOWidth;
        var scaleFBOHeight;
        var scaleFBOTexture;
        var scaleFBO;

        var renderId;

        function pot(x) {
            x--;
            x |= x >> 1;
            x |= x >> 2;
            x |= x >> 4;
            x |= x >> 8;
            x |= x >> 16;
            x++;
            return x;
        }

        function generateNoise(width, height) {
            width = pot(width);
            height = pot(height);

            if (noiseTexture && width <= noiseTextureWidth && height <= noiseTextureHeight)
                return;
            noiseTextureWidth = width;
            noiseTextureHeight = height;

            if (noiseTexture)
                gl.deleteTexture(noiseTexture);
            noiseTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, noiseTexture);

            var data = [];
            for (var i = 0; i < 4 * width * height; i++) {
                data[i] = Math.floor(256 * Math.random());
            }

            gl.texImage2D(
                gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                new Uint8Array(data)
            );
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
            gl.bindTexture(gl.TEXTURE_2D, null);
        }

        function generateScaleFBO(width, height) {
            width = pot(width);
            height = pot(height);

            if (scaleFBO && width <= scaleFBOWidth && height <= scaleFBOHeight)
                return;
            scaleFBOWidth = width;
            scaleFBOHeight = height;

            if (scaleFBOTexture)
                gl.deleteTexture(scaleFBOTexture);
            scaleFBOTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, scaleFBOTexture);

            gl.texImage2D(
                gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                null
            );
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.bindTexture(gl.TEXTURE_2D, null);

            if (scaleFBO)
                gl.deleteFramebuffer(scaleFBO);
            scaleFBO = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, scaleFBO);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, scaleFBOTexture, 0);

        }

        function buildContext() {
            canvas.width = 0;
            canvas.height = 0;

            shaderBG = gl.createProgram();
            gl.attachShader(shaderBG, loadShader(gl, gl.VERTEX_SHADER,
`#version 100
precision highp float;

attribute vec4 aVertexPosition;

uniform vec2 uView;

uniform vec3 uEdge;
uniform vec2 uTimeFade;
uniform vec2 uMouse;

varying vec3 vEdge;
varying vec2 vTimeFade;
varying vec2 vUV;
varying vec2 vMouse;

void main() {
    vEdge = uEdge;
    vTimeFade = uTimeFade;
    vUV = aVertexPosition.xy * uView;
    vMouse = uMouse;

    gl_Position = aVertexPosition;
}
`
            ));
            gl.attachShader(shaderBG, loadShader(gl, gl.FRAGMENT_SHADER,
`#version 100
precision highp float;

#define PI 3.14159
#define TAU 6.28318

#define round(x) (floor(x+0.5))
// #define crush(c, x) (floor(x * c + 0.5))
#define crush(c, x) (fract(x * c))

uniform sampler2D uSamplerNoise;

varying vec3 vEdge;
#define vEdgeScale (vEdge.x)
#define vEdgeWidth (vEdge.y)
#define vEdgeCount (vEdge.z)
varying vec2 vTimeFade;
#define vTime (vTimeFade.x)
#define vFadeBG (vTimeFade.y)
varying vec2 vUV;
varying vec2 vMouse;

vec4 get(vec3 v) {
    float a = cos(sin(v.x * 3.8) + sin(v.y * 3.8 + v.z * 3.24));
    float b = sin(v.x * 2.47 + v.z * 4.0) + sin(v.y * 2.47);
    float c = sin(v.x - sin(v.y) + v.z);
    float d = mod(a + b + c, mod(2.0 + 1.0 * fract(a + v.y + v.z), 4.0 * v.y + a + 4.324 * v.z) + mod(4.0 * v.x + c, 1.0 + 0.3 * a - 0.1 * b) + b);
    
    return vec4(a, b, c, d);
}

void main() {
    vec2 uv = vUV;
    float t = vTime;

    // vec2 m = 0.5 + 0.5 * sin(0.5 * PI * (vMouse - 0.5));
    vec2 m = vMouse;

    float grow = 1.0 - min(1.0, max(0.0, 8.0 * distance(uv, m)));
    grow = grow * grow;

    uv += 0.05 * m;

    uv *= vEdgeWidth * 8.0;

    vec4 cv = get(vec3(uv, t));
    float cc = cv.w;
    cc = 0.8 + min(0.2, cc * 0.1);

    float growbf = 0.02 * grow;
    float edgec = vEdgeCount * 8.0;

    float cf = get(vec3(0.1 * edgec * uv, t)).w;
    float d = smoothstep(0.95, 1.0,
        0.5 * grow + abs(sin(PI * edgec * cf))
    );
    d = smoothstep(0.8, 0.9, d * d * d);

    cc *= vFadeBG;
    d *= vFadeBG * vFadeBG;

    float c = cc * d;

    c += vFadeBG * vFadeBG * 0.01 * texture2D(uSamplerNoise, vUV).a;

    // c = 0.95 - c;
    c = 0.1 + c;

    // c = get(vec3(uv, t)).rgb;

    gl_FragColor = vec4(vec3(c) + d * 0.9 - (d * 1.1 * cv.rgb), 1.0);
    // gl_FragColor = vec4(vec3(c), 1.0);
}
`
            ));
            gl.linkProgram(shaderBG);
            
            if (!gl.getProgramParameter(shaderBG, gl.LINK_STATUS))
                throw new Error("Background shader program link failed.");
            
            infoBG = {
                attribLocations: {
                    vertexPosition: gl.getAttribLocation(shaderBG, "aVertexPosition"),
                },
                uniformLocations: {
                    view: gl.getUniformLocation(shaderBG, "uView"),
                    samplerNoise: gl.getUniformLocation(shaderBG, "uSamplerNoise"),
                    edge: gl.getUniformLocation(shaderBG, "uEdge"),
                    timeFade: gl.getUniformLocation(shaderBG, "uTimeFade"),
                    mouse: gl.getUniformLocation(shaderBG, "uMouse"),
                },
            };

            shaderBlit = gl.createProgram();
            gl.attachShader(shaderBlit, loadShader(gl, gl.VERTEX_SHADER,
`#version 100
precision mediump float;

attribute vec4 aVertexPosition;

uniform vec2 uView;

varying vec2 vUV;

void main() {
    vUV = (aVertexPosition.xy * 0.5 + 0.5) * uView;
    gl_Position = aVertexPosition;
}
`
            ));
            gl.attachShader(shaderBlit, loadShader(gl, gl.FRAGMENT_SHADER,
`#version 100
precision mediump float;

uniform sampler2D uSampler;

varying vec2 vUV;

void main() {
    gl_FragColor = texture2D(uSampler, vUV);
}
`
            ));
            gl.linkProgram(shaderBlit);
            
            if (!gl.getProgramParameter(shaderBlit, gl.LINK_STATUS))
                throw new Error("Background blitting shader program link failed.");
            
            infoBlit = {
                attribLocations: {
                    vertexPosition: gl.getAttribLocation(shaderBlit, "aVertexPosition"),
                },
                uniformLocations: {
                    sampler: gl.getUniformLocation(shaderBlit, "uSampler"),
                    view: gl.getUniformLocation(shaderBlit, "uView"),
                },
            };

            rectBuffer = gl.createBuffer();

            gl.bindBuffer(gl.ARRAY_BUFFER, rectBuffer);

            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
                1.0,  1.0,
                -1.0,  1.0,
                1.0, -1.0,
                -1.0, -1.0,
            ]), gl.STATIC_DRAW);

            gl.bindBuffer(gl.ARRAY_BUFFER, rectBuffer);
            gl.vertexAttribPointer(infoBG.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(infoBG.attribLocations.vertexPosition);

            renderId = requestAnimationFrame(render);    
        }
        canvas.addEventListener("webglcontextlost", e => {
            console.log("die");
            cancelAnimationFrame(renderId);
            event.preventDefault();
        }, false);
        canvas.addEventListener("webglcontextrestored", e => {
            console.log("revive");
            noiseTexture = null;
            gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
            buildContext();
        }, false);
        buildContext();

        var nowoffs = Date.now();
        var dropped = 0;
        var dynscale = 4;
        var frameskip = 0;
        var frameskipped = 0;
        var then;
        var start;
        var delta;
        var time = 0;
        var fade = 0;
        var _set_data_bg = false;
        function render(_now) {
            var now = window.performance.now();
            if (!start)
                start = now;
            now -= start;
            
            if (frameskipped < frameskip) {
                frameskipped++;
                renderId = requestAnimationFrame(render);
                return;
            }

            var dynscaleOld = dynscale;

            var fsf = (1 + frameskipped);
            if (!then)
                then = now - 1000 / 60 * fsf;
            if (now - then > 1000 / 20 * fsf)
                dropped++;
            else if (now - then < 1000 / 50 * fsf)
                dropped--;
            if (dropped > 5) {
                dynscale += 0.75;
                dropped = 0;
                console.log("Low performance. Scale: ", dynscale);
            } else if (dropped < -5) {
                dynscale = Math.max(1, dynscale * 0.9);
                dropped = 0;
                if (dynscale != dynscaleOld)
                    console.log("High performance. Scale: ", dynscale);
            }
            delta = now - then;
            then = now;
            frameskipped = 0;

            if (now > 200) {
                if (!Main.BG.dark) {
                    fade += delta / 400;
                    fade = Math.max(0, Math.min(0.6, fade));
                } else if (fade < 0.3) {
                    fade += delta / 400;
                    fade = Math.max(0, Math.min(0.3, fade));
                } else if (fade > 0.3) {
                    fade -= delta / 400;
                    fade = Math.max(0.3, Math.min(0.6, fade));
                }
            }
            time += delta * fade;

            var density = 1; /*(
                window.devicePixelRatio ||
                window.webkitDevicePixelRatio ||
                window.mozDevicePixelRatio ||
                window.opDevicePixelRatio ||
                1
            );*/
            var dyndensity = density / dynscale;

            var width = canvas.clientWidth;
            var height = canvas.clientHeight;
            var aspect = width / height;

            var outputWidth = width * density;    
            var outputHeight = height * density;    

            var scaleWidth = width * dyndensity;
            var scaleHeight = height * dyndensity;

            var vwidth;
            var vheight;
            if (aspect < 1.0) {
                vwidth = aspect;
                vheight = 1.0;
            } else {
                vwidth = 1.0;
                vheight = 1.0 / aspect;
            }

            var resized = canvas.width != outputWidth || canvas.height != outputHeight;
            if (resized) {
                canvas.width = outputWidth;
                canvas.height = outputHeight;

                generateNoise(outputWidth, outputHeight);

                gl.useProgram(shaderBG);
                // Update view bounds.
                gl.uniform2fv(
                    infoBG.uniformLocations.view,
                    [0.5 * vwidth, 0.5 * vheight]
                );

            }

            generateScaleFBO(scaleWidth, scaleHeight);    

            if (resized || dynscaleOld != dynscale) {
                gl.useProgram(shaderBG);
                // Update edgeScale, edgeWidth, edgeCount on resize and rescale.
                gl.uniform3fv(
                    infoBG.uniformLocations.edge,
                    [
                        Math.max(1.0, dynscale), // Scale
                        100 / Math.min(outputWidth, outputHeight), // Width
                        Math.min(outputWidth, outputHeight) / 700 // Count
                    ]
                );

                gl.useProgram(shaderBlit);
                // scaleFBO is larger than scale, as scaleFBO is POT.
                gl.uniform2fv(
                    infoBlit.uniformLocations.view,
                    [scaleWidth / scaleFBOWidth, scaleHeight / scaleFBOHeight]
                );
            }

            // Draw to scaleFBO.

            gl.bindFramebuffer(gl.FRAMEBUFFER, scaleFBO);
            gl.viewport(0, 0, width * dyndensity, height * dyndensity);
            
            gl.useProgram(shaderBG);
            gl.uniform2fv(
                infoBG.uniformLocations.timeFade,
                [
                    (nowoffs / 100 % 1024) + 0.03 * time / 1000,
                    fade
                ]
            );
            gl.uniform2fv(
                infoBG.uniformLocations.mouse,
                [vwidth * mouse[0], vheight * mouse[1]]
            );

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, noiseTexture);
            gl.uniform1i(infoBG.uniformLocations.samplerNoise, 0);
            
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            // Draw to screen.

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, canvas.width, canvas.height);

            gl.useProgram(shaderBlit);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, scaleFBOTexture);
            gl.uniform1i(infoBlit.uniformLocations.sampler, 0);
            
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            if (!_set_data_bg) {
                document.body.setAttribute("data-bg", "on");
                _set_data_bg = true;
            }

            renderId = requestAnimationFrame(render);
        }

    },

};

Main.BG.init();