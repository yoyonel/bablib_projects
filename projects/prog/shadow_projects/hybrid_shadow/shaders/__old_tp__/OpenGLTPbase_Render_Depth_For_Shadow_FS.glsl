// Define used GLSL version
#version 120

uniform sampler2DShadow	shadowMap;
//uniform sampler2D	shadowMap;
	
// Current vertex varying attributes for fragment shader
varying vec4 q;

void main(void) {
	vec3	posViewLightNormalized;
	vec3	posViewTextureLight;	
	float	shadow;	
	float	depth_bias = -0.015;
	vec4	resultColor;
	vec3	posViewLight = q.xyz;

	posViewLightNormalized	= posViewLight / q.w;
	posViewLightNormalized.z	+= depth_bias;	

	posViewTextureLight = (posViewLightNormalized + vec3(1.) ) * vec3(0.5);	

	shadow = shadow2D( shadowMap, posViewTextureLight ).r;	
	resultColor = vec4(shadow);

	//float	zTexelOccluder;
	//zTexelOccluder = texture2D(shadowMap, posViewTextureLight.xy).x;
	//shadow = zTexelOccluder > posViewTextureLight.z ? 1 : 0;	
	//resultColor = vec4(shadow, posViewTextureLight.z, zTexelOccluder, 0);

	gl_FragColor = resultColor;
}
