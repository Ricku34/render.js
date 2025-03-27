#version 300 es
precision highp float;

#define texture2D texture
#define texture2DLodEXT textureLod
#define textureCube texture

#define varying in
#define gl_FragColor outColor
layout (location = 0) out vec4 outColor;