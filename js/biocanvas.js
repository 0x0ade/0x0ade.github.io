//@ts-check

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

class BG {

  constructor() {
    this.dark = false;

    this.nowoffs = Date.now();
    this.dropped = 0;
    this.dynscale = 4;
    this.frameskip = 0;
    this.frameskipped = 0;
    this.then = 0;
    this.start = 0;
    this.delta = 0;
    this.time = 0;
    this.timeRaw = 0;
    this.timeFast = 0;
    this.fade = 0;
    this._set_data_bg = false;
    let mouse = this.mouse = [0.5, 0.5];
    document.addEventListener("mousemove", e => {
      if (!this.canvas)
        return;
      mouse[0] = e.clientX / this.canvas.clientWidth - 0.5;
      mouse[1] = 1.0 - e.clientY / this.canvas.clientHeight - 0.5;
    }, false);

    this.render = this.render.bind(this);
  }

  init() {
    /** @type {HTMLCanvasElement} */
    // @ts-ignore
    this.canvas = document.getElementById("biocanvas");

    if (!this.canvas)
      return;

    /** @type {WebGLRenderingContext} */
    this.gl = null;

    try {
      this.gl = this.canvas.getContext("webgl") || this.canvas.getContext("experimental-webgl");
    } catch(e) {
    }

    if (!this.gl)
      return false;

    this.canvas.addEventListener("webglcontextlost", e => {
      console.log("die");
      cancelAnimationFrame(this.renderId);
      event.preventDefault();
    }, false);
    this.canvas.addEventListener("webglcontextrestored", e => {
      console.log("revive");
      this.noiseTexture = null;
      this.gl = this.canvas.getContext("webgl") || this.canvas.getContext("experimental-webgl");
      this.buildContext();
    }, false);
    this.buildContext();
  }

  buildContext() {
    let { canvas, gl } = this;

    canvas.width = 0;
    canvas.height = 0;

    gl.getExtension("OES_standard_derivatives");

    let shaderBG = this.shaderBG = gl.createProgram();
    gl.attachShader(shaderBG, this.loadShader(gl.VERTEX_SHADER,
`#version 100
precision highp float;

attribute vec4 aVertexPosition;

uniform vec2 uView;

uniform vec3 uEdge;
uniform vec3 uTimeFadeTimeRaw;
uniform vec2 uMouse;

varying vec3 vEdge;
varying vec3 vTimeFadeTimeRaw;
varying vec4 vUVXY;
varying vec2 vMouse;

void main() {
  vEdge = uEdge;
  vTimeFadeTimeRaw = uTimeFadeTimeRaw;
  vUVXY = vec4(aVertexPosition.xy * uView, aVertexPosition.xy);
  vMouse = uMouse;

  gl_Position = aVertexPosition;
}
`
    ));
    gl.attachShader(shaderBG, this.loadShader(gl.FRAGMENT_SHADER,
`#version 100
#extension GL_OES_standard_derivatives : enable
precision highp float;

#define PI 3.14159
#define TAU 6.28318

#define round(x) (floor(x+0.5))
#define crush(c, x) (floor(x * c + 0.5) / c)
// #define crush(c, x) (fract(x * c))

uniform sampler2D uSamplerNoise;

varying vec3 vEdge;
#define vEdgeScale (vEdge.x)
#define vEdgeWidth (vEdge.y)
#define vEdgeCount (vEdge.z)
varying vec3 vTimeFadeTimeRaw;
#define vTime (vTimeFadeTimeRaw.x)
#define vFadeBG (vTimeFadeTimeRaw.y)
#define vTimeRaw (vTimeFadeTimeRaw.z)
varying vec4 vUVXY;
#define vUV (vUVXY.xy)
#define vXY (vUVXY.zw)
varying vec2 vMouse;

vec4 get(vec3 v) {
  float a = cos(sin(v.x * 3.8) + sin(v.y * 3.8 + v.z * 3.24));
  float b = sin(v.x * 2.47 + v.z * 4.0) + sin(v.y * 2.47);
  float c = sin(v.x - sin(v.y) + v.z);
  float d = sin(a + b + c + sin(2.0 + 1.0 * cos(a + v.y + v.z) * 4.0 * v.y + a + 4.324 * v.z) + cos(4.0 * v.x + c + 1.0 + 0.3 * a - 0.1 * b) + b);

  return vec4(a, b, c, d);
}

vec4 get2(vec3 v) {
  float a = sin(4.9 - cos(v.y * 1.7) + cos(v.x * 1.7 + v.z * 4.24));
  float b = sin(4.0 + v.x * 0.47 - v.z * 3.0) - sin(v.y * 0.47);
  float c = cos(2.0 - v.x - sin(v.y) - 1.5 * v.z);
  float d = sin(2.0 + a * b - c - sin(2.0 + 1.0 * cos(a + v.y - v.z) * 4.0 * v.y + a + 4.324 * v.z) - cos(4.0 * v.x + c + 1.0 + 0.3 * a - 0.1 * b) + b);

  return vec4(a, b, c, d);
}

void main() {
  vec2 uv = vUV;
  vec2 xy = vXY;
  float t = vTime;
  float tr = vTimeRaw;

  vec2 m = vMouse;

  uv += 0.01 * m;

  uv *= vEdgeWidth * 3.0;
  uv *= 1.0 + 0.8 * smoothstep(-0.2, 0.4, uv.x);

  vec4 cv = 0.5 + 0.5 * get(vec3(uv, t + m.x * 0.02));
  vec4 ev = 0.5 + 0.5 * get2(vec3(uv - m * 0.01, t - m.y * 0.02));

  float d = cv.w * 0.9 + ev.w * 0.2;

  vec3 c = 0.1 * d + 0.1 * cv.rgb * (0.9 + d * 0.2);

  c = min(c, vec3(1.0 - d)) + (1.0 - d) * 0.2;
  c = max(c * 5.0, cv.rgb * 1.3) * 0.2;
  c = 0.9 * c + 0.9 * vec3(c.r + c.g, c.g + c.b, c.b + c.r);
  c = (0.5 + c) * c;
  c = c * (0.3 + 0.9 * ev.rgb);
  c = 0.9 * c - 0.1 * vec3(ev.r + ev.g, ev.g + ev.b, ev.b + ev.r);
  c = c * 0.8 + 0.5 * c * ev.rgb;
  c = 0.3 * c + 0.3 * vec3(max(c.r, max(c.g, c.b)));

  float cf = c.r * 0.3 + c.g * 0.4 + c.b * 0.3;

  vec3 c2 = vec3(cf) / (c + 1.0) - c;

  gl_FragColor = vec4(cf * 0.7 + c * 0.2 + c2 * 0.4, 1.0);
}
`
    ));
    gl.linkProgram(shaderBG);
    
    if (!gl.getProgramParameter(shaderBG, gl.LINK_STATUS))
      throw new Error("Background shader program link failed.");
    
    this.infoBG = {
      attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderBG, "aVertexPosition"),
      },
      uniformLocations: {
        view: gl.getUniformLocation(shaderBG, "uView"),
        samplerNoise: gl.getUniformLocation(shaderBG, "uSamplerNoise"),
        edge: gl.getUniformLocation(shaderBG, "uEdge"),
        timeFadeTimeRaw: gl.getUniformLocation(shaderBG, "uTimeFadeTimeRaw"),
        mouse: gl.getUniformLocation(shaderBG, "uMouse"),
      },
    };

    this.shaderBlit = gl.createProgram();
    gl.attachShader(this.shaderBlit, this.loadShader(gl.VERTEX_SHADER,
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
    gl.attachShader(this.shaderBlit, this.loadShader(gl.FRAGMENT_SHADER,
`#version 100
precision mediump float;

uniform sampler2D uSampler;

varying vec2 vUV;

void main() {
gl_FragColor = texture2D(uSampler, vUV);
}
`
    ));
    gl.linkProgram(this.shaderBlit);
    
    if (!gl.getProgramParameter(this.shaderBlit, gl.LINK_STATUS))
      throw new Error("Background blitting shader program link failed.");
    
    this.infoBlit = {
      attribLocations: {
        vertexPosition: gl.getAttribLocation(this.shaderBlit, "aVertexPosition"),
      },
      uniformLocations: {
        sampler: gl.getUniformLocation(this.shaderBlit, "uSampler"),
        view: gl.getUniformLocation(this.shaderBlit, "uView"),
      },
    };

    this.rectBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, this.rectBuffer);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      1.0,  1.0,
      -1.0,  1.0,
      1.0, -1.0,
      -1.0, -1.0,
    ]), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.rectBuffer);
    gl.vertexAttribPointer(this.infoBG.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.infoBG.attribLocations.vertexPosition);

    this.renderId = requestAnimationFrame(this.render);  
  }

  loadShader(type, src) {
    let { gl } = this;

    let shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      let msg =
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

  generateNoise(width, height) {
    let { gl } = this;

    width = pot(width);
    height = pot(height);

    if (this.noiseTexture && width <= this.noiseTextureWidth && height <= this.noiseTextureHeight)
      return;
    this.noiseTextureWidth = width;
    this.noiseTextureHeight = height;

    if (this.noiseTexture)
      gl.deleteTexture(this.noiseTexture);
    this.noiseTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.noiseTexture);

    let data = [];
    for (let i = 0; i < 4 * width * height; i++) {
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

  generateScaleFBO(width, height) {
    let { gl } = this;

    width = pot(width);
    height = pot(height);

    if (this.scaleFBO && width <= this.scaleFBOWidth && height <= this.scaleFBOHeight)
      return;
    this.scaleFBOWidth = width;
    this.scaleFBOHeight = height;

    if (this.scaleFBOTexture)
      gl.deleteTexture(this.scaleFBOTexture);
    this.scaleFBOTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.scaleFBOTexture);

    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);

    if (this.scaleFBO)
      gl.deleteFramebuffer(this.scaleFBO);
    this.scaleFBO = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.scaleFBO);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.scaleFBOTexture, 0);

  }

  render() {
    let { canvas, gl, shaderBG } = this;

    if (!canvas)
      return;

    let now = window.performance.now();
    if (!this.start)
      this.start = now;
    now -= this.start;
    
    if (this.frameskipped < this.frameskip) {
      this.frameskipped++;
      this.renderId = requestAnimationFrame(this.render);
      return;
    }

    let dynscaleOld = this.dynscale;

    let fsf = (1 + this.frameskipped);
    if (!this.then)
      this.then = now - 1000 / 60 * fsf;
    if (now - this.then > 1000 / 20 * fsf)
      this.dropped++;
    else if (now - this.then < 1000 / 50 * fsf)
      this.dropped--;
    if (this.dropped > 5) {
      this.dynscale += 0.75;
      this.dropped = 0;
      console.log("Low performance. Scale: ", this.dynscale);
    } else if (this.dropped < -5) {
      this.dynscale = Math.max(3.0, this.dynscale * 0.9);
      this.dropped = 0;
      if (this.dynscale != dynscaleOld)
        console.log("High performance. Scale: ", this.dynscale);
    }
    this.delta = now - this.then;
    this.then = now;
    this.frameskipped = 0;

    if (now > 200) {
      if (!this.dark) {
        this.fade += this.delta / 400;
        this.fade = Math.max(0, Math.min(0.6, this.fade));
      } else if (this.fade < 0.3) {
        this.fade += this.delta / 400;
        this.fade = Math.max(0, Math.min(0.3, this.fade));
      } else if (this.fade > 0.3) {
        this.fade -= this.delta / 400;
        this.fade = Math.max(0.3, Math.min(0.6, this.fade));
      }
    }
    this.time += this.delta * this.fade;
    this.time += this.delta * 7.0 * Math.min(1.4, this.timeFast * this.timeFast * this.timeFast);
    this.timeFast = Math.max(0, this.timeFast - this.delta * 0.001);
    this.timeRaw += this.delta;

    let density = 1; /*(
      window.devicePixelRatio ||
      window.webkitDevicePixelRatio ||
      window.mozDevicePixelRatio ||
      window.opDevicePixelRatio ||
      1
    );*/
    let dyndensity = density / this.dynscale;

    let width = this.canvas.clientWidth;
    let height = this.canvas.clientHeight;
    let aspect = width / height;

    let outputWidth = width * density;  
    let outputHeight = height * density;  

    let scaleWidth = width * dyndensity;
    let scaleHeight = height * dyndensity;

    let vwidth;
    let vheight;
    if (aspect < 1.0) {
      vwidth = aspect;
      vheight = 1.0;
    } else {
      vwidth = 1.0;
      vheight = 1.0 / aspect;
    }

    let resized = this.canvas.width != outputWidth || this.canvas.height != outputHeight;
    if (resized) {
      this.canvas.width = outputWidth;
      this.canvas.height = outputHeight;

      this.generateNoise(outputWidth, outputHeight);

      gl.useProgram(shaderBG);
      // Update view bounds.
      gl.uniform2fv(
        this.infoBG.uniformLocations.view,
        [0.5 * vwidth, 0.5 * vheight]
      );

    }

    this.generateScaleFBO(scaleWidth, scaleHeight);  

    if (resized || dynscaleOld != this.dynscale) {
      gl.useProgram(shaderBG);
      // Update edgeScale, edgeWidth, edgeCount on resize and rescale.
      gl.uniform3fv(
        this.infoBG.uniformLocations.edge,
        [
          Math.max(1.0, this.dynscale), // Scale
          100 / Math.min(outputWidth, outputHeight), // Width
          Math.min(outputWidth, outputHeight) / 700 // Count
        ]
      );

      gl.useProgram(this.shaderBlit);
      // scaleFBO is larger than scale, as scaleFBO is POT.
      gl.uniform2fv(
        this.infoBlit.uniformLocations.view,
        [scaleWidth / this.scaleFBOWidth, scaleHeight / this.scaleFBOHeight]
      );
    }

    // Draw to scaleFBO.

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.scaleFBO);
    gl.viewport(0, 0, width * dyndensity, height * dyndensity);
    
    gl.useProgram(shaderBG);
    gl.uniform3fv(
      this.infoBG.uniformLocations.timeFadeTimeRaw,
      [
        (this.nowoffs / 100 % 1024) + 0.03 * this.time / 1000,
        this.fade,
        this.timeRaw / 1000
      ]
    );
    gl.uniform2fv(
      this.infoBG.uniformLocations.mouse,
      [vwidth * this.mouse[0] + window.screenX * 0.05 - window.scrollX * 0.05, vheight * this.mouse[1] - window.screenY * 0.05 + window.scrollY * 0.05]
    );

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.noiseTexture);
    gl.uniform1i(this.infoBG.uniformLocations.samplerNoise, 0);
    
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Draw to screen.

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    gl.useProgram(this.shaderBlit);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.scaleFBOTexture);
    gl.uniform1i(this.infoBlit.uniformLocations.sampler, 0);
    
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    if (!this._set_data_bg) {
      document.body.setAttribute("data-bg", "on");
      this._set_data_bg = true;
    }

    this.renderId = requestAnimationFrame(this.render);
  }

};

var AnimBG = window["AnimBG"] = new BG();
setTimeout(() => AnimBG.init(), 50);
