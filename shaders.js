export const textVert = `#version 300 es

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
const vec2 size = vec2(5.0, 7.0);

void main() {
    float row;
    float col = modf(float(gl_InstanceID) / 40.0, row) * 40.0;

    vec2 pos = vec2(col, row) * vec2(8.0, 10.0) + vec2(0.0, 3.0);

    pos = ((corners[gl_VertexID] * size + pos) + camOffset) * camScale;

    gl_Position = vec4(char == 0.0 ? vec2(2.0) : pos, 0.0, 1.0);
    colourV = colour;
    fontCoord = (vec2(char - 1.0, 0.0) + corners[gl_VertexID]) * vec2(5.0, 7.0);
}
`;

export const textFrag = `#version 300 es
precision highp float;

uniform sampler2D font;

in vec2 fontCoord;
in vec3 colourV;

out vec4 fragColour;

void main() {
    vec4 fontTexel = texelFetch(font, ivec2(fontCoord), 0);
    fragColour = vec4(colourV, fontTexel.r);
}
`;

export const rectVert = `#version 300 es

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
`;

export const rectFrag = `#version 300 es
precision highp float;

in vec3 colourV;

out vec4 fragColour;

void main() {
    fragColour = vec4(colourV, 1.0);
}
`;

export const blitVert = `#version 300 es

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
`;

export const blitFrag = `#version 300 es
precision highp float;

uniform sampler2D src;

in vec2 srcCoord;

out vec4 fragColour;

void main() {
    fragColour = texelFetch(src, ivec2(srcCoord), 0);
}
`;

export const waveVert = `#version 300 es

layout(location = 0) in uint value;

const vec2 camScale = vec2(2.0 / 320.0, -2.0 / 240.0);
const vec2 camOffset = vec2(-160.0, -120.0);

void main() {
    vec2 pos = vec2(float(gl_VertexID), float(value));
    pos = (pos + vec2(0.5) + camOffset) * camScale;

    gl_PointSize = 1.0;
    gl_Position = vec4(pos, 0.0, 1.0);
}
`;

export const waveFrag = `#version 300 es
precision highp float;

uniform vec3 colour;

out vec4 fragColour;

void main() {
    fragColour = vec4(colour, 1.0);
}
`;
