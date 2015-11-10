// Define used GLSL version
#version 120
#define SHADING_USE_PHONG 0

// Current vertex varying attributes for fragment shader
varying vec4 color;

//Interpolated vectors
varying vec3 lightVec;
varying vec3 normalVec;
varying vec3 viewVec;

varying vec4		glPosition;

uniform sampler2D	shadowClipMap;

vec3 shade(vec3 N, vec3 L, vec3 E, vec3 color, float Ka, float Kd, float Ks,  vec3 lightCol, float shininess, float coefShadow);
float computeVisibility();

void main(void) 
{
	float alphaColor = 1.0;
	
	float coefShadow = computeVisibility();	

	vec4 shadeColor = vec4( 
		shade( 
		normalize(normalVec), normalize(lightVec), normalize(viewVec),  
		color.rgb, 0.2, 0.8, 1.0,  vec3(1.0), 32.0, coefShadow), alphaColor);

	gl_FragColor = shadeColor;
}

//Normal, Light, Eye vectors
vec3 shade(
		   vec3 N, vec3 L, vec3 E, 
		   vec3 color, float Ka, float Kd, float Ks, 
		   vec3 lightCol, float shininess,
		   float coefShadow
		   )
{
	vec3 final_color = color*Ka*lightCol;				//ambient
	float lambertTerm = dot(N,L);

	if(lambertTerm > 0.0) {
		final_color += (color*Kd*lightCol * lambertTerm)*coefShadow;	//diffuse

#if SHADING_USE_PHONG //Phong
		vec3 R = reflect(-L, N);
		float specular = pow( max(dot(R, E), 0.0), shininess );
#else //Blinn-Phong
		vec3 halfVec = normalize(L + E);
		float specular = pow( max(dot(N, halfVec), 0.0), shininess );
#endif

		final_color += (color*Ks*lightCol*(specular))*coefShadow; //specular
	}	

	return final_color;		
}

float computeVisibility()
{
	float coefShadow;

	vec4 vShadowClipMap = texture2D(shadowClipMap, 0.5 * (glPosition.xy / glPosition.w + 1.0));

	coefShadow = vShadowClipMap.x;
	//coefShadow = vShadowClipMap.y < vShadowClipMap.z ? 1 : 0;

	return coefShadow;
}