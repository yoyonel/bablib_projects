// Define used GLSL version
#version 120

// Uniform parameters (=global)
uniform mat4 modelViewMat;
uniform mat4 projectionMat;

// Current vertex varying attributes for fragment shader
// This will be interpolated for fragment shader
varying vec3 vViewPosition;

void main(void) {
	vViewPosition = gl_Vertex.xyz;
	gl_Position= projectionMat * modelViewMat * gl_Vertex;	
}