#version 300 es
// Copyright 2021 James Deery
// Released under the MIT licence, https://opensource.org/licenses/MIT

precision highp float;

uniform sampler2D font;

in vec2 fontCoord;
in vec3 colourV;

out vec4 fragColour;

void main() {
    vec4 fontTexel = texelFetch(font, ivec2(fontCoord), 0);
    fragColour = vec4(colourV, fontTexel.r);
}
