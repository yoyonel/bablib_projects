// Define used GLSL version
#version 120

uniform samplerCube skybox;

//Interpolated vectors
varying vec3 vViewPosition;

void main(void) {	
	vec4 color;
	
	color = textureCube(skybox, vViewPosition);
	
	gl_FragColor = color;
}

