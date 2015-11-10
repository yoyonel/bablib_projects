// Define used GLSL version
#version 120

// Uniform parameters (=global)
//uniform mat4 modelViewMat;
//uniform mat4 projectionMat;
uniform mat4 T;

varying vec4 texelLightSpace;

// Current vertex attributes
//attribute vec4 vertexPosition;

void main(void) {
	texelLightSpace = T * gl_Vertex;

	gl_Position = ftransform();
	
}
