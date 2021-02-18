#version 300 es
// Copyright 2021 James Deery
// Released under the MIT licence, https://opensource.org/licenses/MIT

precision highp float;

in vec3 colourV;

out vec4 fragColour;

void main() {
    fragColour = vec4(colourV, 1.0);
}
