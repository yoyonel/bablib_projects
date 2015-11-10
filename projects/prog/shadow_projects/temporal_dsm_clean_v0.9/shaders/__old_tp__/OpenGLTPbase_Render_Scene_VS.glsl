// Define used GLSL version
#version 120

#define __FORCED_COLOR__	0

// Uniform parameters (=global)
uniform mat4 modelViewMat;
uniform mat4 modelViewMatIT;
uniform mat4 projectionMat;

uniform vec3 lightPos;
uniform vec3 forcedColor;

// Current vertex attributes
attribute vec4 vertexPosition;
attribute vec3 vertexNormal;
attribute vec3 vertexColor;

// Current vertex varying attributes for fragment shader
// This will be interpolated for fragment shader
varying vec4 color;

//Interpolated vectors
varying vec3 lightVec;
varying vec3 normalVec;
varying vec3 viewVec;

varying vec4		glPosition;

void main(void) {	
	gl_Position=projectionMat*modelViewMat*vec4(vertexPosition.xyz, 1.0);
	glPosition = gl_Position;
	
	vec4 vertPosView=modelViewMat*vec4(vertexPosition.xyz, 1.0);
	vec3 lightPosView=mat3(modelViewMat)*lightPos;
	
	vec3 normalView=mat3(modelViewMatIT)*vertexNormal;
	vec3 lightVecView=normalize(lightPosView-vertPosView.xyz);
	
	lightVec=lightVecView;
	normalVec=normalView;
	viewVec=-vertPosView.xyz;	
		
#if __FORCED_COLOR__
	color = vec4(forcedColor, 1);
#else
	color = vec4( vertexColor, 1 );
#endif
}