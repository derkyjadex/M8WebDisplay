#version 300 es
// Copyright 2021 James Deery
// Released under the MIT licence, https://opensource.org/licenses/MIT

layout(location = 0) in vec3 colour;
layout(location = 1) in float char;

out vec3 colourV;
out vec2 fontCoord;

const vec2 corners[] = vec2[](
    vec2(0, 0),
    vec2(0, 1),
    vec2(1, 0),
    vec2(1, 1));

const vec2 camScale = vec2(2.0 / 320.0, -2.0 / 240.0);
const vec2 camOffset = vec2(-160.0, -120.0);
const vec2 size = vec2(8.0, 9.0);

void main() {
    float row;
    float col = modf(float(gl_InstanceID) / 40.0, row) * 40.0;
    row = row - 3.0;
    vec2 pos = vec2(col, row) * vec2(10.0, 12.0) + vec2(0.0, 0.0);
    
    if(row == 0.0) {
        pos = pos + vec2(0.0, 5.0); 
    }

    pos = ((corners[gl_VertexID] * size + pos) + camOffset) * camScale;

    gl_Position = vec4(char == 0.0 ? vec2(2.0) : pos, 0.0, 1.0);
    colourV = colour;
    fontCoord = (vec2(char - 1.0, 0.0) + corners[gl_VertexID]) * size;
}
