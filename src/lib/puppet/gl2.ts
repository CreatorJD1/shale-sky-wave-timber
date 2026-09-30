/** WebGL2 compositor. One contained view at a time. Never WebGL 1. */

import { RIG_ASPECT } from "./views";

export interface DrawLayer {
  src: string;
  flip: boolean;
  turn: number;
}

export function createGL2(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: true,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
  });
  if (!gl) return null;

  const vsSrc = `#version 300 es
layout(location=0) in vec2 a_pos;
layout(location=1) in vec2 a_uv;
uniform vec2 u_ndc;
uniform float u_turn;
out vec2 v_uv;
void main(){
  v_uv = a_uv;
  float x = (a_pos.x - 0.5) * u_ndc.x;
  float y = -1.0 + (1.0 - a_pos.y) * u_ndc.y;
  float a = u_turn * 0.017453292;
  float c = cos(a);
  float s = sin(a);
  float x3 = x * c;
  float z3 = x * s;
  float p = 1.0 / (1.0 + z3 * 0.42);
  gl_Position = vec4(x3 * p, y * p, 0.0, 1.0);
}`;

  const fsSrc = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_flip;
out vec4 frag;
void main(){
  vec2 uv = vec2(mix(v_uv.x, 1.0 - v_uv.x, u_flip), v_uv.y);
  vec4 c = texture(u_tex, uv);
  frag = vec4(c.rgb * c.a, c.a);
}`;

  const vs = compile(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;

  const vao = gl.createVertexArray();
  const vbo = gl.createBuffer();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(prog);
  gl.uniform1i(gl.getUniformLocation(prog, "u_tex"), 0);
  const locFlip = gl.getUniformLocation(prog, "u_flip");
  const locNdc = gl.getUniformLocation(prog, "u_ndc");
  const locTurn = gl.getUniformLocation(prog, "u_turn");

  const textures = new Map<string, WebGLTexture>();
  const loaded = new Set<string>();

  function tex(src: string) {
    const existing = textures.get(src);
    if (existing) return existing;
    const t = gl!.createTexture();
    if (!t) return null;
    gl!.bindTexture(gl!.TEXTURE_2D, t);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, 1, 1, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
    const img = new Image();
    img.onload = () => {
      gl!.bindTexture(gl!.TEXTURE_2D, t);
      gl!.pixelStorei(gl!.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
      gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, 0);
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, img);
      loaded.add(src);
    };
    img.src = src;
    textures.set(src, t);
    return t;
  }

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl!.viewport(0, 0, w, h);
    return { w, h };
  }

  function frame(layer: DrawLayer | null) {
    const { w, h } = resize();
    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    if (!layer) return loaded.size > 0;
    const t = tex(layer.src);
    if (!t || !loaded.has(layer.src)) return loaded.size > 0;
    const canA = w / h;
    let ndcW: number;
    let ndcH: number;
    if (canA > RIG_ASPECT) {
      ndcH = 2;
      ndcW = 2 * (RIG_ASPECT / canA);
    } else {
      ndcW = 2;
      ndcH = 2 * (canA / RIG_ASPECT);
    }
    gl!.useProgram(prog);
    gl!.bindVertexArray(vao);
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, t);
    gl!.uniform2f(locNdc, ndcW, ndcH);
    gl!.uniform1f(locTurn, layer.turn);
    gl!.uniform1f(locFlip, layer.flip ? 1 : 0);
    gl!.drawArrays(gl!.TRIANGLES, 0, 6);
    return true;
  }

  return { frame, tex, has: (src: string) => loaded.has(src) };
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn(gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}
