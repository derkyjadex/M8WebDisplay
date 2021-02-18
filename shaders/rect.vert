#version 300 es
// Copyright 2021 James Deery
// Released under the MIT licence, https://opensource.org/licenses/MIT

layout(location = 0) in vec4 shape;
layout(location = 1) in vec3 colour;

out vec3 colourV;

const vec2 corners[] = vec2[](
    vec2(0, 0),
    vec2(0, 1),
    vec2(1, 0),
    vec2(1, 1));

const vec2 camScale = vec2(2.0 / 320.0, -2.0 / 240.0);
const vec2 camOffset = vec2(-160.0, -120.0);

void main() {
    vec2 pos = shape.xy;
    vec2 size = shape.zw;
    pos = ((corners[gl_VertexID] * size + pos) + camOffset) * camScale;

    gl_Position = vec4(pos, 0.0, 1.0);
    colourV = colour;
}
