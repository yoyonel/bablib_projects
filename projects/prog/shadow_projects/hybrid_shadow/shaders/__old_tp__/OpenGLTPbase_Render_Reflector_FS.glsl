// Define used GLSL version
#version 120

#define _REFRACTION_ONLY_	0
#define _REFLECTION_ONLY_	0

//-
//varying vec3	vViewNormal;
varying mat3	normalMatrix;
varying vec3	vNormalVertex;
varying vec2	vTexCoords;
//-
varying vec3	vViewDirection, vColor;

//-
uniform samplerCube cubeMap;
uniform sampler2D	bump;
uniform mat4		matRotation;
//-
uniform vec3 waveLengths;

void main(void) {
	vec3  dirVector		= normalize( -vViewDirection );
		
	vec3  normalVector	= vec3( texture2D(bump, vTexCoords)* 2.0 - 1.0 );	
    normalVector		= normalize(normalMatrix * normalVector);
        
	vec3	reflection    = reflect( dirVector, normalVector );
	
	vec3	refraction1   = mat3(matRotation) * refract( dirVector, normalVector, waveLengths.x),
			refraction2   = mat3(matRotation) * refract( dirVector, normalVector, waveLengths.y),
			refraction3   = mat3(matRotation) * refract( dirVector, normalVector, waveLengths.z);

	float	fresnel;
#if		_REFRACTION_ONLY_
	fresnel = 0;
#elif	_REFLECTION_ONLY_
	fresnel = 1;
#else
	fresnel = clamp(dot(-dirVector, normalVector), 0.0, 1.0);
    fresnel *= fresnel;
#endif

    vec4 reflectionSample  = textureCube(cubeMap, reflection);
    vec4 refractionSample1 = textureCube(cubeMap, refraction1 ),
		 refractionSample2 = textureCube(cubeMap, refraction2 ),
		 refractionSample3 = textureCube(cubeMap, refraction3 );
    vec4 finalRefraction   = vec4(refractionSample1.x, refractionSample2.y, refractionSample3.z, 0.0);    

    gl_FragColor           = mix(finalRefraction, reflectionSample, fresnel) + (vec4(vColor, 1) * 0.2);
}