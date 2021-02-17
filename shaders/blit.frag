#version 300 es
precision highp float;

uniform sampler2D src;

in vec2 srcCoord;

out vec4 fragColour;

void main() {
    fragColour = texelFetch(src, ivec2(srcCoord), 0);
}
