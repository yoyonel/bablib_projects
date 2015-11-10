// Define used GLSL version
#version 120

uniform mat4 T;

varying vec4 texelLightSpace;


void main(void) {
	texelLightSpace = T * gl_Vertex;

	gl_Position = ftransform();	
}
