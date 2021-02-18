#version 300 es
// Copyright 2021 James Deery
// Released under the MIT licence, https://opensource.org/licenses/MIT

out vec2 srcCoord;

const vec2 corners[] = vec2[](
    vec2(0, 0),
    vec2(0, 1),
    vec2(1, 0),
    vec2(1, 1));

void main() {
    vec2 pos = corners[gl_VertexID] * vec2(2.0, 2.0) + vec2(-1.0, -1.0);
    gl_Position = vec4(pos, 0.0, 1.0);
    srcCoord = corners[gl_VertexID] * vec2(320.0, 240.0);
}
