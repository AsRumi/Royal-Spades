import { useEffect, useRef, useState } from 'react';

// Persistent luma-key player. Mounted once and kept alive: the WebGL context,
// compiled shaders, and texture are created a single time, and the selected
// video is preloaded (and its decoder warmed by drawing the first frame)
// ahead of any trigger. Starting a playback is then just seek-to-0 + play(),
// so the effect appears within a frame or two of the event instead of paying
// fetch/demux/decoder-init/shader-compile costs at trigger time.
//
// The shader keys dark pixels transparent so the effect floats over the felt;
// colors are output premultiplied to avoid dark fringes at the key edge. If
// WebGL is missing we fall back to `mix-blend-mode: screen`, which also drops
// pure black.
const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
void main() {
  vec3 c = texture2D(uTex, vUv).rgb;
  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float a = smoothstep(0.06, 0.28, luma);
  gl_FragColor = vec4(c * a, a);
}`;

interface LumaVideoProps {
  src: string | null; // the selected animation, preloaded on change; null = none
  playNonce: number; // increments to start a playback of the preloaded video
  onEnded: () => void;
}

export function LumaVideo({ src, playNonce, onEnded }: LumaVideoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const rafRef = useRef(0);
  const lastNonce = useRef(playNonce);
  const [webglFailed, setWebglFailed] = useState(false);
  const endedRef = useRef(onEnded);
  endedRef.current = onEnded;

  // Reads only refs, so every closure over it stays valid across renders.
  const drawFrame = () => {
    const gl = glRef.current;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!gl || !canvas || !video) return;
    if (video.readyState < video.HAVE_CURRENT_DATA || video.videoWidth === 0) return;
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  // One-time GL pipeline, reused for every play.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true });
    if (!gl) {
      setWebglFailed(true);
      return;
    }

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setWebglFailed(true);
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    glRef.current = gl;

    return () => {
      cancelAnimationFrame(rafRef.current);
      glRef.current = null;
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  // Preload + warm whenever the host's selection changes: buffer the file,
  // then draw the first frame once so the decoder and the GPU upload path
  // (including the first-frame color conversion) are already exercised.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    cancelAnimationFrame(rafRef.current);
    if (!src) {
      video.removeAttribute('src');
      video.load();
      return;
    }
    video.src = src;
    video.load();
    const warm = () => drawFrame();
    video.addEventListener('loadeddata', warm);
    return () => video.removeEventListener('loadeddata', warm);
  }, [src]);

  // Trigger: the video is already buffered and warm, so this is just play().
  useEffect(() => {
    if (playNonce === lastNonce.current) return;
    lastNonce.current = playNonce;
    const video = videoRef.current;
    if (!video || !video.src) return;
    video.currentTime = 0;
    // Play with sound so an animation's audio track is heard on the TV. If the
    // browser's autoplay policy refuses unmuted playback (no interaction with
    // the page yet), retry muted rather than dropping the effect entirely.
    video.muted = false;
    void video.play().catch(() => {
      video.muted = true;
      void video.play().catch(() => endedRef.current());
    });
    cancelAnimationFrame(rafRef.current);
    const loop = () => {
      drawFrame();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [playNonce]);

  const handleEnded = () => {
    cancelAnimationFrame(rafRef.current);
    const video = videoRef.current;
    if (video) video.currentTime = 0; // re-prime the first frame for the next ace
    endedRef.current();
  };

  return (
    <>
      <video
        ref={videoRef}
        playsInline
        preload="auto"
        onEnded={handleEnded}
        onError={handleEnded}
        className={
          webglFailed
            ? 'absolute inset-0 h-full w-full object-cover mix-blend-screen'
            : 'hidden'
        }
      />
      {!webglFailed && (
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-cover" />
      )}
    </>
  );
}
