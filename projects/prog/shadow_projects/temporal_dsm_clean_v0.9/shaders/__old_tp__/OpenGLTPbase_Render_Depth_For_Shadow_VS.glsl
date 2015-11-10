// Define used GLSL version
#version 120

// Uniform parameters (=global)
uniform mat4 modelViewMat;
uniform mat4 projectionMat;
uniform mat4 T;

varying vec4 q;

// Current vertex attributes
attribute vec4 vertexPosition;

void main(void) {
	vec4 p = modelViewMat * vec4(vertexPosition.xyz, 1.0);	
	q = T * p;
	gl_Position=projectionMat*p;
	
}