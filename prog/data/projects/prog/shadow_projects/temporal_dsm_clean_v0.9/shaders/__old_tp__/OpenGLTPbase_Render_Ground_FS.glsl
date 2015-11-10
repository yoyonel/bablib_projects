// Define used GLSL version
#version 120

// Current vertex varying attributes for fragment shader
varying vec4 color;

//Interpolated vectors
varying vec4		glPosition;

uniform sampler2D	shadowClipMap;
uniform sampler2D	texture;

void main(void) 
{
	vec2 clipPos = 0.5 * (glPosition.xy / glPosition.w + 1.0);
	float coefShadow = texture2D(shadowClipMap, clipPos).x;

	vec4 texSample = texture2D(texture, gl_TexCoord[0].xy);

	vec4 shadeColor = texSample * coefShadow;
	//vec4 shadeColor = texSample;
	//vec4 shadeColor = vec4(coefShadow);

	gl_FragColor = shadeColor;
}
