// Define used GLSL version
#version 120

// Uniform parameters (=global)
uniform mat4 modelViewMat;
uniform mat4 projectionMat;

// Current vertex attributes
attribute vec4 vertexPosition;

// This will be interpolated for fragment shader
varying vec4		glPosition;

void main(void) {
	glPosition = projectionMat*modelViewMat*vec4(vertexPosition.xyz, 1.0);
	gl_Position = glPosition;
	
	gl_TexCoord[0]  = gl_MultiTexCoord0;
}