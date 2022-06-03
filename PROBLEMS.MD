Bugs reproduced 100% on both device: Quest 2 and 1 on Browser Version 21.2.0.1.

Runtime support only Quad layer and Projection layer atm.

__Erros on OpenXR backend.__

Layers will empty when you enable a OpenXR backend in chrome://flags in Oculus browser.
Error type is:
```
[.WebGL-0xc6704600]GL ERROR :GL_INVALID_OPERATION : glCopyTexSubImage2D: incompatible format
```

For simple usage we use ALWAYS `RGBA UNSIGNED_BYTE` texture type. That works on default WebXR backend.
Difference between a layers demo and our only that we use copyTexSubImage2D for fast copy from basic texture -> layer: https://github.com/eXponenta/web-xr-ogl-js/blob/master/src/xr/XRRenderTarget.ts#L186

Because XR Layers not support depth test/write we use a mesh with alphaTest (or blend mask) for sorting between layers and projection layer content, this is why we should use and layer and mesh with isolated texture. Copy used for reducing textureSubImage calls (we should update layers each frame).

If disable OpenXR - all ok.

Simple layers demos from https://immersive-web.github.io/webxr-samples/layers-samples/ workings on both runtime.

__GRIP SPACE + RAY SPACE__

Grip space and Ray Space different for default  WebXR backend and OpenXR.

RaySpace misaligned with oculus controller ray, and require manual correction.

But getPose return  different delta transformation between gripSpace and raySpace ~~~each random session~~ between default and OpenXR backend, that limit manual correction, because we can't check what is backend used in current device. Old OS not support OpenXR (checked on Oculus os 20.18)

Maybe we not understand what gripSpace and raySpace means?

__LAYERS BLINKING__: Not fully reproduced

In some cases we has problem with layers blinking after `updateRenderState`, problem that this is `floating` bug and not reproduced easy.
Still trying  to get  100% reproduction.

In this demo we try simulate application lags when we handle 'blinking'. 'blink' should presents when you click 'select' trigger: blue board begun draws on red layer place and back between state changes on some frames.
